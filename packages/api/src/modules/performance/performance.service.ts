import type { DbOrTx } from "@zenith-hr/db";
import {
  competencyTemplate,
  jobPosition,
  notificationOutbox,
  performanceCompetency,
  performanceCycle,
  performanceGoal,
  performanceReview,
  userPositionAssignment,
} from "@zenith-hr/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { z } from "zod";
import { AppError } from "../../shared/errors";
import { generateIdempotencyKey, getActorRole } from "../../shared/utils";
import type {
  batchUpdateCompetenciesSchema,
  createCompetencySchema,
  createCompetencyTemplateSchema,
  createCycleSchema,
  createGoalSchema,
  createReviewSchema,
  GetReviewsInput,
  saveDraftSchema,
  TransitionReviewInput,
  updateCompetencySchema,
  updateCycleSchema,
  updateGoalSchema,
  updateReviewSchema,
} from "./performance.schema";

// ============================================================================
// Types
// ============================================================================

type CreateCycleInput = z.infer<typeof createCycleSchema>;
type UpdateCycleInput = z.infer<typeof updateCycleSchema>;
type CreateReviewInput = z.infer<typeof createReviewSchema>;
type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
type SaveDraftInput = z.infer<typeof saveDraftSchema>;
type CreateCompetencyInput = z.infer<typeof createCompetencySchema>;
type UpdateCompetencyInput = z.infer<typeof updateCompetencySchema>;
type BatchUpdateCompetenciesInput = z.infer<
  typeof batchUpdateCompetenciesSchema
>;
type CreateGoalInput = z.infer<typeof createGoalSchema>;
type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
type CreateCompetencyTemplateInput = z.infer<
  typeof createCompetencyTemplateSchema
>;
type ReviewType = "PROBATION" | "ANNUAL_PERFORMANCE" | "OBJECTIVE_SETTING";
type ReviewStatus =
  | "DUE"
  | "SENT_TO_MANAGER"
  | "SELF_REVIEW"
  | "AWAITING_MANAGER_REVIEW"
  | "SUBMITTED"
  | "HR_REVIEWED"
  | "COMPLETED"
  | "OVERDUE";
interface ReviewRecord {
  employeeId: string;
  reviewerId: string | null;
  reviewType: ReviewType;
  status: ReviewStatus;
}
type ReviewWriteActor = "employee" | "reviewer";
interface ReviewPermissions {
  canCreateCompetencies: boolean;
  canDirectlyEditStatus: boolean;
  canEditCompetencies: boolean;
  canEditManagerComment: boolean;
  canEditOverallRating: boolean;
  canEditProbationDecision: boolean;
  canEditSelfComment: boolean;
  canManageGoals: boolean;
  canSaveDraft: boolean;
  canSubmit: boolean;
}

// ============================================================================
// Service Factory
// ============================================================================

export const createPerformanceService = (db: DbOrTx) => {
  const globalAccessRoles = new Set(["ADMIN", "HOD_HR"]);
  const managerAccessRoles = new Set([
    "ADMIN",
    "CEO",
    "HOD",
    "HOD_FINANCE",
    "HOD_HR",
    "HOD_IT",
    "MANAGER",
  ]);

  /**
   * Helper: Resolves all descendant user IDs recursively from a manager's positions
   */
  const getDescendantUserIds = async (
    managerUserId: string,
  ): Promise<string[]> => {
    // 1. Find the manager's current positions
    const managerPositions = await db
      .select({ positionId: userPositionAssignment.positionId })
      .from(userPositionAssignment)
      .where(eq(userPositionAssignment.userId, managerUserId));

    if (managerPositions.length === 0) {
      return [];
    }

    // We use a CTE to recursively find all subordinate positions
    const managerPosIds = managerPositions.map((p) => p.positionId);

    // Fallback if CTE is complex in raw SQL: iteratively build the tree
    // For simplicity in Drizzle without raw CTEs, we fetch all positions and build a tree in memory
    const allPositions = await db
      .select({
        id: jobPosition.id,
        reportsTo: jobPosition.reportsToPositionId,
      })
      .from(jobPosition);

    const descendantPositionIds = new Set<string>();
    const queue = [...managerPosIds];

    while (queue.length > 0) {
      const currentId = queue.shift();
      // Find children
      const children = allPositions
        .filter((p) => p.reportsTo === currentId)
        .map((p) => p.id);
      for (const childId of children) {
        if (!descendantPositionIds.has(childId)) {
          descendantPositionIds.add(childId);
          queue.push(childId);
        }
      }
    }

    if (descendantPositionIds.size === 0) {
      return [];
    }

    // Find users in these descendant positions
    const descendantAssignments = await db
      .select({ userId: userPositionAssignment.userId })
      .from(userPositionAssignment)
      .where(
        inArray(
          userPositionAssignment.positionId,
          Array.from(descendantPositionIds),
        ),
      );

    return [...new Set(descendantAssignments.map((a) => a.userId))];
  };

  const getActorAccess = async (actorId: string) => {
    const actorRole = await getActorRole(db, actorId);
    return {
      actorRole,
      isGlobal: globalAccessRoles.has(actorRole),
      isManager: managerAccessRoles.has(actorRole),
    };
  };

  const assertCanAccessReview = async (
    review: Pick<ReviewRecord, "employeeId" | "reviewerId">,
    actorId: string,
  ) => {
    const access = await getActorAccess(actorId);
    if (access.isGlobal) {
      return access;
    }

    if (review.employeeId === actorId || review.reviewerId === actorId) {
      return access;
    }

    if (access.isManager) {
      const descendantIds = await getDescendantUserIds(actorId);
      if (descendantIds.includes(review.employeeId)) {
        return access;
      }
    }

    throw AppError.forbidden("You are not allowed to access this review");
  };

  const assertCanWriteReview = async (
    review: Pick<ReviewRecord, "employeeId" | "reviewerId">,
    actorId: string,
    allowedActors: ReviewWriteActor[] = ["employee", "reviewer"],
  ) => {
    const access = await assertCanAccessReview(review, actorId);
    if (access.isGlobal) {
      return access;
    }

    if (allowedActors.includes("employee") && review.employeeId === actorId) {
      return access;
    }

    if (allowedActors.includes("reviewer") && review.reviewerId === actorId) {
      return access;
    }

    throw AppError.forbidden("You are not allowed to modify this review");
  };

  const assertValidTransition = (
    review: ReviewRecord,
    newStatus: TransitionReviewInput["status"],
  ) => {
    if (review.status === newStatus) {
      return;
    }

    const allowedTransitions: Record<
      ReviewType,
      Partial<Record<ReviewStatus, TransitionReviewInput["status"][]>>
    > = {
      PROBATION: {
        DUE: ["SENT_TO_MANAGER", "SUBMITTED", "OVERDUE"],
        SENT_TO_MANAGER: ["SUBMITTED", "OVERDUE"],
        SUBMITTED: ["HR_REVIEWED"],
        HR_REVIEWED: ["COMPLETED"],
        OVERDUE: ["SENT_TO_MANAGER", "SUBMITTED", "HR_REVIEWED"],
      },
      ANNUAL_PERFORMANCE: {
        DUE: ["SELF_REVIEW", "AWAITING_MANAGER_REVIEW", "OVERDUE"],
        SELF_REVIEW: ["AWAITING_MANAGER_REVIEW", "OVERDUE"],
        AWAITING_MANAGER_REVIEW: ["SUBMITTED", "OVERDUE"],
        SUBMITTED: ["HR_REVIEWED"],
        HR_REVIEWED: ["COMPLETED"],
        OVERDUE: ["SELF_REVIEW", "AWAITING_MANAGER_REVIEW", "SUBMITTED"],
      },
      OBJECTIVE_SETTING: {
        DUE: ["SELF_REVIEW", "AWAITING_MANAGER_REVIEW", "COMPLETED", "OVERDUE"],
        SELF_REVIEW: ["AWAITING_MANAGER_REVIEW", "COMPLETED", "OVERDUE"],
        AWAITING_MANAGER_REVIEW: ["COMPLETED", "OVERDUE"],
        OVERDUE: ["AWAITING_MANAGER_REVIEW", "COMPLETED"],
      },
    };

    const allowedForCurrentStatus =
      allowedTransitions[review.reviewType][review.status] ?? [];
    if (!allowedForCurrentStatus.includes(newStatus)) {
      throw AppError.badRequest(
        `Cannot transition ${review.reviewType} review from ${review.status} to ${newStatus}`,
      );
    }
  };

  const assertCanTransitionReview = async (
    review: ReviewRecord,
    newStatus: TransitionReviewInput["status"],
    actorId?: string | null,
  ) => {
    if (!actorId) {
      if (newStatus === "OVERDUE") {
        return;
      }
      throw AppError.forbidden(
        "This transition requires an authenticated actor",
      );
    }

    const access = await assertCanAccessReview(review, actorId);
    if (access.isGlobal) {
      return;
    }

    switch (newStatus) {
      case "SELF_REVIEW":
      case "AWAITING_MANAGER_REVIEW": {
        if (review.employeeId === actorId) {
          return;
        }
        break;
      }
      case "SENT_TO_MANAGER": {
        if (review.reviewerId === actorId) {
          return;
        }
        break;
      }
      case "SUBMITTED": {
        if (review.reviewerId === actorId) {
          return;
        }
        break;
      }
      case "COMPLETED": {
        if (
          review.reviewType === "OBJECTIVE_SETTING" &&
          review.reviewerId === actorId
        ) {
          return;
        }
        break;
      }
      default:
        break;
    }

    throw AppError.forbidden(
      `You are not allowed to transition this review to ${newStatus}`,
    );
  };

  const calculateWeightedScore = (
    competencies: Array<{ rating: number | null; weight: number }>,
  ) => {
    const ratedCompetencies = competencies.filter(
      (comp) => comp.rating !== null,
    );
    if (ratedCompetencies.length === 0) {
      return 0;
    }

    const totalWeight = ratedCompetencies.reduce(
      (sum, comp) => sum + comp.weight,
      0,
    );
    if (totalWeight === 0) {
      return 0;
    }

    const weightedSum = ratedCompetencies.reduce(
      (sum, comp) => sum + (comp.rating ?? 0) * comp.weight,
      0,
    );

    return Math.round((weightedSum / totalWeight) * 100) / 100;
  };

  const determineSubmissionTarget = async (
    reviewId: string,
    actorId: string,
  ) => {
    const review = await db.query.performanceReview.findFirst({
      where: eq(performanceReview.id, reviewId),
    });

    if (!review) {
      throw AppError.notFound("Review not found");
    }

    const access = await assertCanAccessReview(review, actorId);
    const isEmployee = review.employeeId === actorId;
    const isReviewer = review.reviewerId === actorId;

    if (review.reviewType === "PROBATION") {
      if (isReviewer || access.isGlobal) {
        return "SUBMITTED" as const;
      }

      throw AppError.forbidden("You are not allowed to submit this review");
    }

    if (review.reviewType === "ANNUAL_PERFORMANCE") {
      if (isEmployee) {
        return "AWAITING_MANAGER_REVIEW" as const;
      }
      if (isReviewer || access.isGlobal) {
        return "SUBMITTED" as const;
      }
    }

    if (review.reviewType === "OBJECTIVE_SETTING") {
      if (isEmployee) {
        return "AWAITING_MANAGER_REVIEW" as const;
      }
      if (isReviewer || access.isGlobal) {
        return "COMPLETED" as const;
      }
    }

    throw AppError.forbidden("You are not allowed to submit this review");
  };

  const getReviewPermissions = async (
    review: ReviewRecord,
    actorId: string,
  ): Promise<ReviewPermissions> => {
    const access = await assertCanAccessReview(review, actorId);
    const isEmployee = review.employeeId === actorId;
    const isReviewer = review.reviewerId === actorId;
    const canEditSelfComment = access.isGlobal || isEmployee;
    const canEditManagerComment = access.isGlobal || isReviewer;
    const canEditOverallRating = canEditManagerComment;
    const canEditCompetencies = access.isGlobal || isEmployee || isReviewer;
    const canManageGoals = canEditCompetencies;
    const canCreateCompetencies = access.isGlobal;
    const canDirectlyEditStatus = access.isGlobal;
    const canEditProbationDecision =
      review.reviewType === "PROBATION" && (access.isGlobal || isReviewer);
    const canSaveDraft =
      canEditSelfComment || canEditManagerComment || canEditCompetencies;

    let canSubmit = false;
    if (review.reviewType === "PROBATION") {
      canSubmit = access.isGlobal || isReviewer;
    } else if (
      review.reviewType === "ANNUAL_PERFORMANCE" ||
      review.reviewType === "OBJECTIVE_SETTING"
    ) {
      canSubmit = access.isGlobal || isReviewer || isEmployee;
    }

    return {
      canCreateCompetencies,
      canDirectlyEditStatus,
      canEditCompetencies,
      canEditManagerComment,
      canEditOverallRating,
      canEditProbationDecision,
      canEditSelfComment,
      canManageGoals,
      canSaveDraft,
      canSubmit,
    };
  };

  const getAccessibleReview = async (
    txOrDb: DbOrTx,
    reviewId: string,
    actorId: string,
  ) => {
    const review = await txOrDb.query.performanceReview.findFirst({
      where: eq(performanceReview.id, reviewId),
    });

    if (!review) {
      throw AppError.notFound("Review not found");
    }

    await assertCanAccessReview(review, actorId);
    return review;
  };

  const getWritableReview = async (
    txOrDb: DbOrTx,
    reviewId: string,
    actorId: string,
    allowedActors: ReviewWriteActor[] = ["employee", "reviewer"],
  ) => {
    const review = await txOrDb.query.performanceReview.findFirst({
      where: eq(performanceReview.id, reviewId),
    });

    if (!review) {
      throw AppError.notFound("Review not found");
    }

    await assertCanWriteReview(review, actorId, allowedActors);
    return review;
  };

  const getWritableGoal = async (
    txOrDb: DbOrTx,
    goalId: string,
    actorId: string,
    allowedActors: ReviewWriteActor[] = ["employee", "reviewer"],
  ) => {
    const goal = await txOrDb.query.performanceGoal.findFirst({
      where: eq(performanceGoal.id, goalId),
    });

    if (!goal) {
      throw AppError.notFound("Goal not found");
    }

    await getWritableReview(txOrDb, goal.reviewId, actorId, allowedActors);
    return goal;
  };

  const getWritableCompetency = async (
    txOrDb: DbOrTx,
    competencyId: string,
    actorId: string,
    allowedActors: ReviewWriteActor[] = ["employee", "reviewer"],
  ) => {
    const competency = await txOrDb.query.performanceCompetency.findFirst({
      where: eq(performanceCompetency.id, competencyId),
    });

    if (!competency) {
      throw AppError.notFound("Competency not found");
    }

    await getWritableReview(
      txOrDb,
      competency.reviewId,
      actorId,
      allowedActors,
    );
    return competency;
  };

  const buildReviewFieldUpdateData = async (
    review: Pick<ReviewRecord, "employeeId" | "reviewerId">,
    actorId: string,
    input: {
      feedback?: Record<string, unknown>;
      managerComment?: string;
      overallRating?: number;
      selfComment?: string;
      status?: ReviewStatus;
    },
  ) => {
    const access = await getActorAccess(actorId);
    const isEmployee = review.employeeId === actorId;
    const isReviewer = review.reviewerId === actorId;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    let hasChanges = false;

    if (input.status !== undefined) {
      if (!access.isGlobal) {
        throw AppError.forbidden(
          "Only HR or Admin can update review status directly",
        );
      }
      updateData.status = input.status;
      hasChanges = true;
    }

    if (input.managerComment !== undefined) {
      if (!(access.isGlobal || isReviewer)) {
        throw AppError.forbidden(
          "Only the assigned reviewer can update manager comments",
        );
      }
      updateData.managerComment = input.managerComment;
      hasChanges = true;
    }

    if (input.selfComment !== undefined) {
      if (!(access.isGlobal || isEmployee)) {
        throw AppError.forbidden(
          "Only the review employee can update self comments",
        );
      }
      updateData.selfComment = input.selfComment;
      hasChanges = true;
    }

    if (input.overallRating !== undefined) {
      if (!(access.isGlobal || isReviewer)) {
        throw AppError.forbidden(
          "Only the assigned reviewer can update overall ratings",
        );
      }
      updateData.overallRating = String(input.overallRating);
      hasChanges = true;
    }

    if (input.feedback !== undefined) {
      if (!(access.isGlobal || isReviewer)) {
        throw AppError.forbidden(
          "Only the assigned reviewer can update review feedback",
        );
      }
      updateData.feedback = input.feedback;
      hasChanges = true;
    }

    return hasChanges ? updateData : null;
  };

  return {
    // ==========================================================================
    // Cycle Operations
    // ==========================================================================

    /**
     * Create a new performance cycle
     */
    async createCycle(input: CreateCycleInput, createdById?: string) {
      const [cycle] = await db
        .insert(performanceCycle)
        .values({
          name: input.name,
          description: input.description,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          status: "DRAFT",
          createdById,
        })
        .returning();
      if (!cycle) {
        throw AppError.badRequest("Failed to create cycle");
      }
      return cycle;
    },

    /**
     * Get all cycles ordered by creation date
     */
    async getCycles() {
      return await db.query.performanceCycle.findMany({
        orderBy: (cycles, { desc: descFn }) => [descFn(cycles.createdAt)],
        with: {
          createdBy: {
            columns: { id: true, name: true, email: true },
          },
        },
      });
    },

    /**
     * Get a single cycle by ID
     */
    async getCycle(id: string) {
      return await db.query.performanceCycle.findFirst({
        where: eq(performanceCycle.id, id),
        with: {
          createdBy: {
            columns: { id: true, name: true, email: true },
          },
          reviews: {
            with: {
              employee: {
                columns: { id: true, name: true, email: true, image: true },
              },
              reviewer: {
                columns: { id: true, name: true, email: true, image: true },
              },
            },
          },
        },
      });
    },

    /**
     * Update a cycle
     */
    async updateCycle(input: UpdateCycleInput) {
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name) {
        updateData.name = input.name;
      }
      if (input.description !== undefined) {
        updateData.description = input.description;
      }
      if (input.startDate) {
        updateData.startDate = new Date(input.startDate);
      }
      if (input.endDate) {
        updateData.endDate = new Date(input.endDate);
      }
      if (input.status) {
        updateData.status = input.status;
      }

      const [updated] = await db
        .update(performanceCycle)
        .set(updateData)
        .where(eq(performanceCycle.id, input.cycleId))
        .returning();
      if (!updated) {
        throw AppError.notFound("Cycle not found");
      }
      return updated;
    },

    // ==========================================================================
    // Review Operations
    // ==========================================================================

    /**
     * Create a new performance review with default competencies from templates
     */
    async createReview(input: CreateReviewInput) {
      return await db.transaction(async (tx) => {
        const cycle = await tx.query.performanceCycle.findFirst({
          where: eq(performanceCycle.id, input.cycleId),
        });

        if (!cycle) {
          throw AppError.notFound("Performance cycle not found");
        }

        // Create the review
        const [review] = await tx
          .insert(performanceReview)
          .values({
            cycleId: input.cycleId,
            employeeId: input.employeeId,
            reviewerId: input.reviewerId,
            reviewType: input.reviewType,
            reviewPeriodStart: input.reviewPeriodStart
              ? new Date(input.reviewPeriodStart)
              : undefined,
            reviewPeriodEnd: input.reviewPeriodEnd
              ? new Date(input.reviewPeriodEnd)
              : undefined,
            dueAt: input.reviewPeriodEnd
              ? new Date(input.reviewPeriodEnd)
              : cycle.endDate,
            status: "DUE",
            completionPercentage: 0,
          })
          .returning();

        if (!review) {
          throw AppError.badRequest("Failed to create review");
        }

        // Get competency templates for this review type
        const templates = await tx.query.competencyTemplate.findMany({
          where: and(
            eq(competencyTemplate.isActive, 1),
            inArray(competencyTemplate.reviewType, [input.reviewType]),
          ),
          orderBy: [desc(competencyTemplate.displayOrder)],
        });

        // Also get templates that apply to all review types (null reviewType)
        const globalTemplates = await tx
          .select()
          .from(competencyTemplate)
          .where(
            and(
              eq(competencyTemplate.isActive, 1),
              sql`${competencyTemplate.reviewType} IS NULL`,
            ),
          )
          .orderBy(desc(competencyTemplate.displayOrder));

        const allTemplates = [...templates, ...globalTemplates];

        // Create competencies from templates
        if (allTemplates.length > 0) {
          await tx.insert(performanceCompetency).values(
            allTemplates.map((t) => ({
              reviewId: review.id,
              name: t.name,
              description: t.description,
              weight: t.weight,
            })),
          );
        }

        return review;
      });
    },

    /**
     * Get a review with all details
     */
    async getReview(reviewId: string, actorId: string) {
      const review = await db.query.performanceReview.findFirst({
        where: eq(performanceReview.id, reviewId),
        with: {
          cycle: true,
          employee: {
            columns: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              createdAt: true,
            },
          },
          reviewer: {
            columns: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
            },
          },
          competencies: {
            orderBy: (c, { asc }) => [asc(c.createdAt)],
          },
          goals: {
            orderBy: (g, { asc }) => [asc(g.createdAt)],
          },
        },
      });

      if (!review) {
        return null;
      }

      await assertCanAccessReview(review, actorId);
      const permissions = await getReviewPermissions(review, actorId);
      return {
        ...review,
        permissions,
      };
    },

    /**
     * Get reviews with filtering and pagination
     */
    async getReviews(
      params: GetReviewsInput & {
        roleFilters?: {
          isManager?: boolean;
          isHr?: boolean;
          asEmployee?: boolean;
          currentUserId?: string;
        };
      },
      actorId: string,
    ) {
      const {
        cycleId,
        employeeId,
        reviewerId,
        status,
        reviewType,
        page,
        pageSize,
      } = params;

      const conditions: ReturnType<typeof eq>[] = [];

      const access = await getActorAccess(actorId);
      if (access.isGlobal) {
        if (employeeId) {
          conditions.push(eq(performanceReview.employeeId, employeeId));
        }
        if (reviewerId) {
          conditions.push(eq(performanceReview.reviewerId, reviewerId));
        }
      } else {
        if (reviewerId) {
          if (reviewerId !== actorId) {
            throw AppError.forbidden(
              "You cannot list reviews for another reviewer",
            );
          }
          conditions.push(eq(performanceReview.reviewerId, reviewerId));
        }

        if (employeeId) {
          if (employeeId === actorId) {
            conditions.push(eq(performanceReview.employeeId, employeeId));
          } else if (access.isManager) {
            const descendantIds = await getDescendantUserIds(actorId);
            if (!descendantIds.includes(employeeId)) {
              throw AppError.forbidden(
                "You cannot list reviews outside your reporting hierarchy",
              );
            }
            conditions.push(eq(performanceReview.employeeId, employeeId));
          } else {
            throw AppError.forbidden(
              "You cannot list another employee's reviews",
            );
          }
        } else if (!reviewerId) {
          if (access.isManager) {
            const descendantIds = await getDescendantUserIds(actorId);
            if (descendantIds.length === 0) {
              return {
                data: [],
                pagination: { page, pageSize, total: 0, totalPages: 0 },
              };
            }
            conditions.push(
              inArray(performanceReview.employeeId, descendantIds),
            );
          } else {
            conditions.push(eq(performanceReview.employeeId, actorId));
          }
        }
      }

      if (cycleId) {
        conditions.push(eq(performanceReview.cycleId, cycleId));
      }
      if (status && status.length > 0) {
        conditions.push(inArray(performanceReview.status, status));
      }
      if (reviewType && reviewType.length > 0) {
        conditions.push(inArray(performanceReview.reviewType, reviewType));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [reviews, countResult] = await Promise.all([
        db.query.performanceReview.findMany({
          where: whereClause,
          with: {
            employee: {
              columns: { id: true, name: true, email: true, image: true },
            },
            reviewer: {
              columns: { id: true, name: true, email: true },
            },
            cycle: {
              columns: { id: true, name: true },
            },
          },
          orderBy: (r, { desc: descFn }) => [descFn(r.updatedAt)],
          limit: pageSize,
          offset: (page - 1) * pageSize,
        }),
        db
          .select({ count: sql<number>`count(*)` })
          .from(performanceReview)
          .where(whereClause),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      return {
        data: reviews,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    },

    /**
     * State Machine Transition
     */
    async transitionReviewStatus(
      reviewId: string,
      newStatus: TransitionReviewInput["status"],
      actorId?: string | null,
      payload?: TransitionReviewInput["payload"],
    ) {
      return await db.transaction(async (tx) => {
        const review = await tx.query.performanceReview.findFirst({
          where: eq(performanceReview.id, reviewId),
          with: {
            competencies: true,
            goals: true,
            employee: true,
            reviewer: true,
          },
        });

        if (!review) {
          throw AppError.notFound("Review not found");
        }

        assertValidTransition(review, newStatus);
        await assertCanTransitionReview(review, newStatus, actorId);

        const validatesRatings = [
          "AWAITING_MANAGER_REVIEW",
          "SUBMITTED",
        ].includes(newStatus);

        if (review.reviewType !== "OBJECTIVE_SETTING" && validatesRatings) {
          const unratedCompetencies = review.competencies.filter(
            (competency) => competency.rating === null,
          );
          if (unratedCompetencies.length > 0) {
            throw AppError.badRequest("All competencies must be rated");
          }

          const lowRatingsWithoutJustification = review.competencies.filter(
            (competency) =>
              competency.rating !== null &&
              competency.rating < 3 &&
              !competency.justification,
          );
          if (lowRatingsWithoutJustification.length > 0) {
            throw AppError.badRequest("Low ratings require justification");
          }
        }

        // Guards based on review type
        if (
          review.reviewType === "OBJECTIVE_SETTING" &&
          newStatus === "COMPLETED"
        ) {
          if (!review.goals || review.goals.length === 0) {
            throw AppError.badRequest(
              "Cannot complete objective setting without goals",
            );
          }
          const totalWeight = review.goals.reduce(
            (sum, g) => sum + (g.weight ?? 0),
            0,
          );
          if (totalWeight !== 100) {
            throw AppError.badRequest(
              `Goal weights must equal exactly 100%. Current: ${totalWeight}%`,
            );
          }
        }

        // Prepare updates
        const updateData: Record<string, unknown> = {
          status: newStatus,
          updatedAt: new Date(),
        };

        if (validatesRatings) {
          updateData.totalScore = String(
            calculateWeightedScore(review.competencies),
          );
          updateData.completionPercentage = 100;
          updateData.submittedAt = new Date();
        }

        if (newStatus === "COMPLETED") {
          updateData.acknowledgedAt = new Date();
        }

        if (
          payload?.probationConfirmationDecision &&
          review.reviewType === "PROBATION"
        ) {
          updateData.probationConfirmationDecision =
            payload.probationConfirmationDecision;
        }

        // Notifications side effects
        const notificationsToQueue: Array<{
          idempotencyKey: string;
          nextAttemptAt: Date;
          payload: {
            body: string;
            link: string;
            title: string;
            type: "ACTION_REQUIRED" | "INFO" | "REMINDER";
          };
          status: "PENDING";
          updatedAt: Date;
          userId: string;
        }> = [];

        const queueNotification = (
          userId: string,
          type: "ACTION_REQUIRED" | "INFO" | "REMINDER",
          title: string,
          body: string,
          link: string,
        ) => {
          const now = new Date();
          notificationsToQueue.push({
            idempotencyKey: generateIdempotencyKey(
              `performance:${reviewId}:${newStatus}:${userId}`,
            ),
            nextAttemptAt: now,
            payload: {
              body,
              link,
              title,
              type,
            },
            status: "PENDING",
            updatedAt: now,
            userId,
          });
        };

        // Specific notification rules based on transition
        if (newStatus === "SENT_TO_MANAGER" && review.reviewerId) {
          queueNotification(
            review.reviewerId,
            "ACTION_REQUIRED",
            "New Probation Review Assigned",
            "A probation review has been assigned to you and requires action.",
            `/performance/${reviewId}`,
          );
        } else if (newStatus === "SELF_REVIEW") {
          queueNotification(
            review.employeeId,
            "ACTION_REQUIRED",
            "Your Annual Review is Due",
            "Your annual performance review is ready for self review.",
            `/performance/${reviewId}`,
          );
        } else if (
          newStatus === "AWAITING_MANAGER_REVIEW" &&
          review.reviewerId
        ) {
          queueNotification(
            review.reviewerId,
            "ACTION_REQUIRED",
            "Review pending your evaluation",
            "A performance review is waiting for your evaluation.",
            `/performance/${reviewId}`,
          );
        } else if (newStatus === "SUBMITTED" || newStatus === "HR_REVIEWED") {
          // Notify HR (generic HR group or if specific actor known)
          // In Zenith, HR dashboards catch this, but we could broadcast
        } else if (newStatus === "COMPLETED") {
          queueNotification(
            review.employeeId,
            "INFO",
            "Performance Review Completed",
            "Your performance review has been completed.",
            `/performance/${reviewId}`,
          );
        } else if (newStatus === "OVERDUE") {
          queueNotification(
            review.employeeId,
            "REMINDER",
            "Performance Action Overdue",
            "A performance action for this review is overdue.",
            `/performance/${reviewId}`,
          );
          if (review.reviewerId) {
            queueNotification(
              review.reviewerId,
              "REMINDER",
              "Subordinate Performance Action Overdue",
              "A subordinate review assigned to you is overdue.",
              `/performance/${reviewId}`,
            );
          }
        }

        const [updated] = await tx
          .update(performanceReview)
          .set(updateData)
          .where(eq(performanceReview.id, reviewId))
          .returning();

        if (notificationsToQueue.length > 0) {
          await tx
            .insert(notificationOutbox)
            .values(notificationsToQueue)
            .onConflictDoNothing();
        }

        return updated;
      });
    },

    /**
     * Update a review
     */
    async updateReview(input: UpdateReviewInput, actorId: string) {
      const review = await getWritableReview(db, input.reviewId, actorId);

      const updateData = await buildReviewFieldUpdateData(review, actorId, {
        feedback: input.feedback,
        managerComment: input.managerComment,
        overallRating: input.overallRating,
        selfComment: input.selfComment,
        status: input.status,
      });

      if (!updateData) {
        return review;
      }

      const [updated] = await db
        .update(performanceReview)
        .set(updateData)
        .where(eq(performanceReview.id, input.reviewId))
        .returning();

      if (!updated) {
        throw AppError.notFound("Review not found");
      }
      return updated;
    },

    /**
     * Save review draft (for auto-save)
     */
    async saveDraft(input: SaveDraftInput, actorId: string) {
      return await db.transaction(async (tx) => {
        const review = await getWritableReview(tx, input.reviewId, actorId);

        // Update review fields
        const updateData = await buildReviewFieldUpdateData(review, actorId, {
          managerComment: input.managerComment,
          selfComment: input.selfComment,
        });

        if (updateData) {
          await tx
            .update(performanceReview)
            .set(updateData)
            .where(eq(performanceReview.id, input.reviewId));
        }

        // Update competency ratings
        if (input.competencyRatings && input.competencyRatings.length > 0) {
          for (const rating of input.competencyRatings) {
            await getWritableCompetency(tx, rating.competencyId, actorId);
            await tx
              .update(performanceCompetency)
              .set({
                rating: rating.rating,
                justification: rating.justification,
                ratedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(performanceCompetency.id, rating.competencyId));
          }
        }

        // Recalculate completion percentage inline
        const competencies = await tx.query.performanceCompetency.findMany({
          where: eq(performanceCompetency.reviewId, input.reviewId),
        });

        let completionPercentage = 0;
        if (competencies.length > 0) {
          const ratedCount = competencies.filter(
            (c) => c.rating !== null,
          ).length;
          completionPercentage = Math.round(
            (ratedCount / competencies.length) * 100,
          );
        }

        await tx
          .update(performanceReview)
          .set({ completionPercentage })
          .where(eq(performanceReview.id, input.reviewId));

        return { success: true };
      });
    },

    /**
     * Submit a review (validates all competencies are rated)
     */
    async submitReview(reviewId: string, _submitterId: string) {
      const targetStatus = await determineSubmissionTarget(
        reviewId,
        _submitterId,
      );
      return await this.transitionReviewStatus(
        reviewId,
        targetStatus,
        _submitterId,
      );
    },

    /**
     * Calculate the total score for a review (weighted average of competencies)
     */
    async calculateTotalScore(reviewId: string): Promise<number> {
      const competencies = await db.query.performanceCompetency.findMany({
        where: eq(performanceCompetency.reviewId, reviewId),
      });

      if (competencies.length === 0) {
        return 0;
      }

      const ratedCompetencies = competencies.filter((c) => c.rating !== null);
      if (ratedCompetencies.length === 0) {
        return 0;
      }

      let totalWeight = 0;
      let weightedSum = 0;

      for (const comp of ratedCompetencies) {
        totalWeight += comp.weight;
        weightedSum += (comp.rating ?? 0) * comp.weight;
      }

      if (totalWeight === 0) {
        return 0;
      }

      // Return score with 2 decimal places
      return Math.round((weightedSum / totalWeight) * 100) / 100;
    },

    /**
     * Update completion percentage based on rated competencies
     */
    async updateCompletionPercentage(reviewId: string) {
      const competencies = await db.query.performanceCompetency.findMany({
        where: eq(performanceCompetency.reviewId, reviewId),
      });

      if (competencies.length === 0) {
        await db
          .update(performanceReview)
          .set({ completionPercentage: 0 })
          .where(eq(performanceReview.id, reviewId));
        return 0;
      }

      const ratedCount = competencies.filter((c) => c.rating !== null).length;
      const percentage = Math.round((ratedCount / competencies.length) * 100);

      await db
        .update(performanceReview)
        .set({ completionPercentage: percentage })
        .where(eq(performanceReview.id, reviewId));

      return percentage;
    },

    // ==========================================================================
    // Competency Operations
    // ==========================================================================

    /**
     * Add a competency to a review
     */
    async createCompetency(input: CreateCompetencyInput, actorId: string) {
      const access = await getActorAccess(actorId);
      if (!access.isGlobal) {
        throw AppError.forbidden(
          "Only HR or Admin can manage review competencies",
        );
      }

      await getAccessibleReview(db, input.reviewId, actorId);

      const [competency] = await db
        .insert(performanceCompetency)
        .values({
          reviewId: input.reviewId,
          name: input.name,
          description: input.description,
          weight: input.weight,
        })
        .returning();

      if (!competency) {
        throw AppError.badRequest("Failed to create competency");
      }
      return competency;
    },

    /**
     * Update a single competency rating
     */
    async updateCompetency(input: UpdateCompetencyInput, raterId: string) {
      await getWritableCompetency(db, input.competencyId, raterId);

      const [updated] = await db
        .update(performanceCompetency)
        .set({
          rating: input.rating,
          justification: input.justification,
          ratedById: raterId,
          ratedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(performanceCompetency.id, input.competencyId))
        .returning();

      if (!updated) {
        throw AppError.notFound("Competency not found");
      }

      // Get the review ID and update completion percentage
      if (updated.reviewId) {
        await this.updateCompletionPercentage(updated.reviewId);
      }

      return updated;
    },

    /**
     * Batch update competency ratings (for save draft)
     */
    async batchUpdateCompetencies(
      input: BatchUpdateCompetenciesInput,
      raterId: string,
    ) {
      return await db.transaction(async (tx) => {
        await getWritableReview(tx, input.reviewId, raterId);

        for (const comp of input.competencies) {
          await getWritableCompetency(tx, comp.competencyId, raterId);
          await tx
            .update(performanceCompetency)
            .set({
              rating: comp.rating,
              justification: comp.justification,
              ratedById: raterId,
              ratedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(performanceCompetency.id, comp.competencyId));
        }

        // Update completion percentage inline
        const competencies = await tx.query.performanceCompetency.findMany({
          where: eq(performanceCompetency.reviewId, input.reviewId),
        });

        let completionPercentage = 0;
        if (competencies.length > 0) {
          const ratedCount = competencies.filter(
            (c) => c.rating !== null,
          ).length;
          completionPercentage = Math.round(
            (ratedCount / competencies.length) * 100,
          );
        }

        await tx
          .update(performanceReview)
          .set({ completionPercentage })
          .where(eq(performanceReview.id, input.reviewId));

        return { success: true };
      });
    },

    // ==========================================================================
    // Goal Operations
    // ==========================================================================

    /**
     * Create a goal for a review
     */
    async createGoal(input: CreateGoalInput, actorId: string) {
      await getWritableReview(db, input.reviewId, actorId);

      const [goal] = await db
        .insert(performanceGoal)
        .values({
          reviewId: input.reviewId,
          title: input.title,
          description: input.description,
          targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
          weight: input.weight,
          status: "PENDING",
        })
        .returning();

      if (!goal) {
        throw AppError.badRequest("Failed to create goal");
      }
      return goal;
    },

    /**
     * Update a goal
     */
    async updateGoal(input: UpdateGoalInput, actorId: string) {
      await getWritableGoal(db, input.goalId, actorId);

      const updateData: Record<string, unknown> = { updatedAt: new Date() };

      if (input.title) {
        updateData.title = input.title;
      }
      if (input.description !== undefined) {
        updateData.description = input.description;
      }
      if (input.targetDate) {
        updateData.targetDate = new Date(input.targetDate);
      }
      if (input.rating) {
        updateData.rating = input.rating;
      }
      if (input.comment !== undefined) {
        updateData.comment = input.comment;
      }
      if (input.status) {
        updateData.status = input.status;
      }

      const [updated] = await db
        .update(performanceGoal)
        .set(updateData)
        .where(eq(performanceGoal.id, input.goalId))
        .returning();

      if (!updated) {
        throw AppError.notFound("Goal not found");
      }
      return updated;
    },

    /**
     * Delete a goal
     */
    async deleteGoal(goalId: string, actorId: string) {
      await getWritableGoal(db, goalId, actorId);

      const [deleted] = await db
        .delete(performanceGoal)
        .where(eq(performanceGoal.id, goalId))
        .returning();

      if (!deleted) {
        throw AppError.notFound("Goal not found");
      }
      return deleted;
    },

    /**
     * Get goals for a review
     */
    async getGoals(reviewId: string, actorId: string) {
      await getAccessibleReview(db, reviewId, actorId);

      return await db.query.performanceGoal.findMany({
        where: eq(performanceGoal.reviewId, reviewId),
        orderBy: (g, { asc }) => [asc(g.createdAt)],
      });
    },

    // ==========================================================================
    // Competency Template Operations
    // ==========================================================================

    /**
     * Create a competency template
     */
    async createCompetencyTemplate(input: CreateCompetencyTemplateInput) {
      const [template] = await db
        .insert(competencyTemplate)
        .values({
          name: input.name,
          description: input.description,
          weight: input.weight,
          category: input.category,
          reviewType: input.reviewType,
          displayOrder: input.displayOrder,
          isActive: 1,
        })
        .returning();

      if (!template) {
        throw AppError.badRequest("Failed to create template");
      }
      return template;
    },

    /**
     * Get all active competency templates
     */
    async getCompetencyTemplates(reviewType?: string) {
      const conditions = [eq(competencyTemplate.isActive, 1)];
      if (reviewType) {
        conditions.push(
          inArray(competencyTemplate.reviewType, [
            reviewType as
              | "PROBATION"
              | "ANNUAL_PERFORMANCE"
              | "OBJECTIVE_SETTING",
          ]),
        );
      }

      return await db.query.competencyTemplate.findMany({
        where: and(...conditions),
        orderBy: (t, { asc }) => [asc(t.displayOrder)],
      });
    },

    // ==========================================================================
    // Dashboard Aggregations (HR / Manager)
    // ==========================================================================

    async getManagerDashboard(managerId: string) {
      const descendantIds = await getDescendantUserIds(managerId);
      if (descendantIds.length === 0) {
        return { awaitingAction: 0, overdue: 0, completed: 0 };
      }

      const result = await db
        .select({
          status: performanceReview.status,
          count: sql<number>`count(*)`,
        })
        .from(performanceReview)
        .where(inArray(performanceReview.employeeId, descendantIds))
        .groupBy(performanceReview.status);

      let awaitingAction = 0;
      let overdue = 0;
      let completed = 0;

      for (const row of result) {
        if (
          ["SENT_TO_MANAGER", "AWAITING_MANAGER_REVIEW"].includes(row.status)
        ) {
          awaitingAction += Number(row.count);
        } else if (row.status === "OVERDUE") {
          overdue += Number(row.count);
        } else if (row.status === "COMPLETED") {
          completed += Number(row.count);
        }
      }

      return { awaitingAction, overdue, completed };
    },

    async getHrDashboard() {
      const result = await db
        .select({
          status: performanceReview.status,
          type: performanceReview.reviewType,
          count: sql<number>`count(*)`,
        })
        .from(performanceReview)
        .groupBy(performanceReview.status, performanceReview.reviewType);

      const metrics = {
        probationDue: 0,
        objectiveDue: 0,
        annualDue: 0,
        overdue: 0,
        completed: 0,
      };

      for (const row of result) {
        if (row.status === "DUE") {
          if (row.type === "PROBATION") {
            metrics.probationDue += Number(row.count);
          }
          if (row.type === "OBJECTIVE_SETTING") {
            metrics.objectiveDue += Number(row.count);
          }
          if (row.type === "ANNUAL_PERFORMANCE") {
            metrics.annualDue += Number(row.count);
          }
        } else if (row.status === "OVERDUE") {
          metrics.overdue += Number(row.count);
        } else if (row.status === "COMPLETED") {
          metrics.completed += Number(row.count);
        }
      }

      return metrics;
    },
  };
};

// Export service type for context.ts
export type PerformanceService = ReturnType<typeof createPerformanceService>;
