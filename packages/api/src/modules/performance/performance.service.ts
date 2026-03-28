import type { DbOrTx } from "@zenith-hr/db";
import {
  competencyTemplate,
  department,
  jobPosition,
  notificationOutbox,
  performanceCompetency,
  performanceGoal,
  performanceReview,
  user,
  userPositionAssignment,
} from "@zenith-hr/db";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import type { z } from "zod";
import { AppError } from "../../shared/errors";
import {
  generateIdempotencyKey,
  getActorPositionInfo,
  getActorRole,
} from "../../shared/utils";
import type {
  batchUpdateCompetenciesSchema,
  createCompetencySchema,
  createCompetencyTemplateSchema,
  createGoalSchema,
  createObjectiveSettingForEmployeeSchema,
  createReviewSchema,
  GetReviewsInput,
  SubmitGoalReviewAsAnnualInput,
  saveDraftSchema,
  TransitionReviewInput,
  updateCompetencySchema,
  updateGoalSchema,
  updateReviewSchema,
} from "./performance.schema";

// ============================================================================
// Types
// ============================================================================

type CreateReviewInput = z.infer<typeof createReviewSchema>;
type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
type SaveDraftInput = z.infer<typeof saveDraftSchema>;
type CreateCompetencyInput = z.infer<typeof createCompetencySchema>;
type UpdateCompetencyInput = z.infer<typeof updateCompetencySchema>;
type BatchUpdateCompetenciesInput = z.infer<
  typeof batchUpdateCompetenciesSchema
>;
type CreateGoalInput = z.infer<typeof createGoalSchema>;
type CreateObjectiveSettingForEmployeeInput = z.infer<
  typeof createObjectiveSettingForEmployeeSchema
>;
type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
type CreateCompetencyTemplateInput = z.infer<
  typeof createCompetencyTemplateSchema
>;
type ReviewType = "PROBATION" | "ANNUAL_PERFORMANCE" | "OBJECTIVE_SETTING";
type ReviewStatus =
  | "DRAFT"
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
  probationConfirmationDecision: string | null;
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

async function assertActiveEmployeeForReview(
  txOrDb: DbOrTx,
  employeeId: string,
) {
  const row = await txOrDb.query.user.findFirst({
    where: eq(user.id, employeeId),
    columns: { id: true, status: true, departmentId: true },
  });
  if (!row) {
    throw AppError.notFound("Employee not found");
  }
  if (row.status !== "ACTIVE") {
    throw AppError.badRequest(
      "Performance reviews can only be created for active employees",
    );
  }
  return row;
}

function computeProbationReviewEditFlags(args: {
  reviewType: ReviewType;
  isEmployee: boolean;
  isReviewer: boolean;
  isGlobal: boolean;
  managerCanEditProbation: boolean;
}) {
  const {
    reviewType,
    isEmployee,
    isReviewer,
    isGlobal,
    managerCanEditProbation,
  } = args;
  const isProbationSelfView = reviewType === "PROBATION" && isEmployee;
  const baseManager = isGlobal || isReviewer || managerCanEditProbation;
  return {
    isProbationSelfView,
    canEditSelfComment: isProbationSelfView ? true : isEmployee,
    canEditManagerComment: isProbationSelfView ? false : baseManager,
    canEditOverallRating: isProbationSelfView ? false : baseManager,
    canEditCompetencies: isProbationSelfView
      ? false
      : isGlobal || isEmployee || isReviewer || managerCanEditProbation,
    canEditProbationDecision:
      !isProbationSelfView && reviewType === "PROBATION" && baseManager,
  };
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

  /**
   * In some deployments, "Head of HR" may not be stored as `HOD_HR` role,
   * but as a generic `HOD` position that belongs to the HR department.
   * For viewing probation candidates, treat that as HR-equivalent.
   */
  const isHrDepartmentHeadForViewing = async (
    actorId: string,
    role: string,
    positionInfo: Awaited<ReturnType<typeof getActorPositionInfo>>,
  ) => {
    const actorUser = await db.query.user.findFirst({
      where: eq(user.id, actorId),
      columns: { role: true },
    });

    const actorUserRole = actorUser?.role;
    if (
      role === "HOD_HR" ||
      role === "ADMIN" ||
      actorUserRole === "HOD_HR" ||
      actorUserRole === "ADMIN"
    ) {
      return true;
    }

    if (role !== "HOD" || !positionInfo?.departmentId) {
      return false;
    }

    const [hrDept] = await db
      .select({ id: department.id })
      .from(department)
      .where(eq(department.name, "Human Resources"))
      .limit(1);

    return hrDept?.id === positionInfo.departmentId;
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

  const canManagerEditProbation = (
    review: Pick<ReviewRecord, "reviewType" | "probationConfirmationDecision">,
    isManager: boolean,
  ) =>
    isManager &&
    review.reviewType === "PROBATION" &&
    review.probationConfirmationDecision !== "CONFIRM_EMPLOYMENT" &&
    review.probationConfirmationDecision !== "RECOMMEND_TERMINATION";

  const assertCanWriteReview = async (
    review: Pick<
      ReviewRecord,
      | "employeeId"
      | "reviewerId"
      | "reviewType"
      | "probationConfirmationDecision"
    >,
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

    if (canManagerEditProbation(review, access.isManager)) {
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
        DUE: ["SELF_REVIEW", "AWAITING_MANAGER_REVIEW", "OVERDUE", "SUBMITTED"],
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
    const managerCanEditProbation = canManagerEditProbation(
      review,
      access.isManager,
    );
    const {
      isProbationSelfView,
      canEditSelfComment,
      canEditManagerComment,
      canEditOverallRating,
      canEditCompetencies,
      canEditProbationDecision,
    } = computeProbationReviewEditFlags({
      reviewType: review.reviewType,
      isEmployee,
      isReviewer,
      isGlobal: access.isGlobal,
      managerCanEditProbation,
    });
    const canManageGoals = canEditCompetencies;
    const canCreateCompetencies = access.isGlobal;
    const canDirectlyEditStatus = access.isGlobal;
    const canSaveDraft =
      canEditSelfComment || canEditManagerComment || canEditCompetencies;

    let canSubmit = false;
    if (review.reviewType === "PROBATION") {
      canSubmit = isProbationSelfView ? false : access.isGlobal || isReviewer;
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
    review: Pick<
      ReviewRecord,
      | "employeeId"
      | "reviewerId"
      | "reviewType"
      | "probationConfirmationDecision"
    >,
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
    const managerCanEditProbation = canManagerEditProbation(
      review,
      access.isManager,
    );
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
      if (!(access.isGlobal || isReviewer || managerCanEditProbation)) {
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
      if (!(access.isGlobal || isReviewer || managerCanEditProbation)) {
        throw AppError.forbidden(
          "Only the assigned reviewer can update overall ratings",
        );
      }
      updateData.overallRating = String(input.overallRating);
      hasChanges = true;
    }

    if (input.feedback !== undefined) {
      if (!(access.isGlobal || isReviewer || managerCanEditProbation)) {
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
    // Review Operations
    // ==========================================================================

    /**
     * Create a new performance review with default competencies from templates.
     * At most one open (DUE) OBJECTIVE_SETTING per employee; at most one PROBATION per employee.
     */
    async createReview(input: CreateReviewInput, actorId?: string | null) {
      return await db.transaction(async (tx) => {
        const employee = await assertActiveEmployeeForReview(
          tx,
          input.employeeId,
        );

        if (input.reviewType === "PROBATION" && actorId) {
          const actorRole = await getActorRole(tx, actorId);
          const positionInfo = await getActorPositionInfo(tx, actorId);
          const isAdmin = actorRole === "ADMIN";
          const isHodRole = actorRole.startsWith("HOD");

          // HR can view all probation-eligible employees, but only create probation
          // reviews within their own department.
          if (!isAdmin && isHodRole) {
            if (!positionInfo?.departmentId) {
              throw AppError.forbidden("No department scope for this actor");
            }

            if (employee.departmentId !== positionInfo.departmentId) {
              throw AppError.forbidden(
                "Employee is outside your department scope",
              );
            }
          }
        }

        if (input.reviewType === "OBJECTIVE_SETTING") {
          const existing = await tx.query.performanceReview.findFirst({
            where: and(
              eq(performanceReview.employeeId, input.employeeId),
              eq(performanceReview.reviewType, "OBJECTIVE_SETTING"),
              sql`${performanceReview.status} IN ('DUE', 'SENT_TO_MANAGER', 'SELF_REVIEW', 'AWAITING_MANAGER_REVIEW', 'OVERDUE')`,
            ),
            columns: { id: true },
          });
          if (existing) {
            throw AppError.badRequest(
              "Employee already has an open goal review. Edit it or submit as annual.",
            );
          }
        }
        if (input.reviewType === "PROBATION") {
          const existing = await tx.query.performanceReview.findFirst({
            where: and(
              eq(performanceReview.employeeId, input.employeeId),
              eq(performanceReview.reviewType, "PROBATION"),
            ),
            columns: { id: true },
          });
          if (existing) {
            throw AppError.badRequest(
              "Employee already has a probation review. Only one probation per user.",
            );
          }
        }

        const dueAt = input.reviewPeriodEnd
          ? new Date(input.reviewPeriodEnd)
          : undefined;

        const [review] = await tx
          .insert(performanceReview)
          .values({
            employeeId: input.employeeId,
            reviewerId: input.reviewerId,
            reviewType: input.reviewType,
            reviewPeriodStart: input.reviewPeriodStart
              ? new Date(input.reviewPeriodStart)
              : undefined,
            reviewPeriodEnd: input.reviewPeriodEnd
              ? new Date(input.reviewPeriodEnd)
              : undefined,
            dueAt,
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
      const { employeeId, reviewerId, status, reviewType, page, pageSize } =
        params;

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

      // For annual reviews, compute completion % from goal achievements when feedback is updated
      const linkedObjectiveReviewId = review.linkedObjectiveReviewId;
      if (
        review.reviewType === "ANNUAL_PERFORMANCE" &&
        linkedObjectiveReviewId &&
        input.feedback &&
        typeof input.feedback === "object" &&
        "goalAchievements" in input.feedback
      ) {
        const goalAchievements = input.feedback.goalAchievements as Record<
          string,
          { achievedPercentage?: number }
        >;
        if (goalAchievements && typeof goalAchievements === "object") {
          const objectiveGoals = await db.query.performanceGoal.findMany({
            where: eq(performanceGoal.reviewId, linkedObjectiveReviewId),
            columns: { id: true, weight: true },
          });
          const weightById = new Map(
            objectiveGoals.map((g) => [g.id, g.weight ?? 0]),
          );
          let weightedSum = 0;
          let totalWeight = 0;
          for (const [goalId, assessment] of Object.entries(goalAchievements)) {
            const weight = weightById.get(goalId) ?? 0;
            const achieved =
              typeof assessment?.achievedPercentage === "number"
                ? assessment.achievedPercentage
                : 0;
            weightedSum += (achieved / 100) * weight;
            totalWeight += weight;
          }
          const completionPercentage =
            totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;
          (updateData as Record<string, unknown>).completionPercentage =
            Math.min(100, Math.max(0, completionPercentage));
        }
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
          feedback: input.feedback,
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

    // ==========================================================================
    // Employee Lists (Performance landing)
    // ==========================================================================

    /**
     * Get employees for the "All employees" performance tab.
     * HR HOD / Admin: all active employees. Other HODs: only employees in their department.
     */
    async getPerformanceEmployeesAll(userId: string) {
      const role = await getActorRole(db, userId);
      const positionInfo = await getActorPositionInfo(db, userId);
      const isHrOrAdmin = await isHrDepartmentHeadForViewing(
        userId,
        role,
        positionInfo,
      );

      const conditions = [eq(user.status, "ACTIVE")];
      if (!isHrOrAdmin && positionInfo?.departmentId) {
        conditions.push(eq(user.departmentId, positionInfo.departmentId));
      }
      if (!(isHrOrAdmin || positionInfo?.departmentId)) {
        return [];
      }

      const rows = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          departmentId: user.departmentId,
          joiningDate: user.joiningDate,
        })
        .from(user)
        .where(and(...conditions))
        .orderBy(user.name);

      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        departmentId: r.departmentId ?? undefined,
        joiningDate: r.joiningDate?.toISOString() ?? undefined,
      }));
    },

    /**
     * Get employees for the "Probation employees" tab: joined more than 6 months ago
     * regardless of whether they already have a probation review.
     */
    async getPerformanceEmployeesProbation(userId: string) {
      const role = await getActorRole(db, userId);
      const positionInfo = await getActorPositionInfo(db, userId);
      const isHrOrAdmin = await isHrDepartmentHeadForViewing(
        userId,
        role,
        positionInfo,
      );

      const conditions = [eq(user.status, "ACTIVE")];
      if (!isHrOrAdmin && positionInfo?.departmentId) {
        conditions.push(eq(user.departmentId, positionInfo.departmentId));
      }
      if (!(isHrOrAdmin || positionInfo?.departmentId)) {
        return [];
      }

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      conditions.push(lt(user.joiningDate, sixMonthsAgo));

      const rows = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          departmentId: user.departmentId,
          joiningDate: user.joiningDate,
        })
        .from(user)
        .where(and(...conditions))
        .orderBy(user.name);

      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        departmentId: r.departmentId ?? undefined,
        joiningDate: r.joiningDate?.toISOString() ?? undefined,
      }));
    },

    // ==========================================================================
    // Objective / Annual Review actions from employee list
    // ==========================================================================

    async getEmployeeObjectiveReviewState(actorId: string, employeeId: string) {
      const role = await getActorRole(db, actorId);
      const positionInfo = await getActorPositionInfo(db, actorId);
      const isHrOrAdmin = await isHrDepartmentHeadForViewing(
        actorId,
        role,
        positionInfo,
      );

      if (!isHrOrAdmin) {
        if (!positionInfo?.departmentId) {
          throw AppError.forbidden("No department scope for this actor");
        }
        const employee = await db.query.user.findFirst({
          where: eq(user.id, employeeId),
          columns: { id: true, departmentId: true },
        });
        if (!employee) {
          throw AppError.notFound("Employee not found");
        }
        if (employee.departmentId !== positionInfo.departmentId) {
          throw AppError.forbidden("Employee is outside your department scope");
        }
      }

      const openStatuses = [
        "DUE",
        "SENT_TO_MANAGER",
        "SELF_REVIEW",
        "AWAITING_MANAGER_REVIEW",
        "OVERDUE",
      ] as const;
      const activeObjective = await db.query.performanceReview.findFirst({
        where: and(
          eq(performanceReview.employeeId, employeeId),
          eq(performanceReview.reviewType, "OBJECTIVE_SETTING"),
          inArray(performanceReview.status, openStatuses),
        ),
        orderBy: (r, { desc }) => [desc(r.createdAt)],
        columns: { id: true, status: true, createdAt: true },
      });

      const latestGoalOrAnnual = await db.query.performanceReview.findFirst({
        where: and(
          eq(performanceReview.employeeId, employeeId),
          inArray(performanceReview.reviewType, [
            "OBJECTIVE_SETTING",
            "ANNUAL_PERFORMANCE",
          ]),
        ),
        orderBy: (r, { desc }) => [desc(r.updatedAt)],
        columns: { id: true },
      });

      const probationReview = await db.query.performanceReview.findFirst({
        where: and(
          eq(performanceReview.employeeId, employeeId),
          eq(performanceReview.reviewType, "PROBATION"),
        ),
        orderBy: (r, { desc }) => [desc(r.createdAt)],
        columns: { id: true, probationConfirmationDecision: true },
      });

      return {
        activeObjectiveReviewId: activeObjective?.id ?? null,
        activeObjectiveStatus: activeObjective?.status ?? null,
        latestObjectiveReviewId: latestGoalOrAnnual?.id ?? null,
        probationReviewId: probationReview?.id ?? null,
        probationConfirmationDecision:
          probationReview?.probationConfirmationDecision ?? null,
      };
    },

    async getEmployeesObjectiveReviewStates(
      actorId: string,
      employeeIds: string[],
    ) {
      const uniqueIds = [...new Set(employeeIds)].filter(Boolean);
      if (uniqueIds.length === 0) {
        return {};
      }

      const role = await getActorRole(db, actorId);
      const positionInfo = await getActorPositionInfo(db, actorId);
      const isHrOrAdmin = await isHrDepartmentHeadForViewing(
        actorId,
        role,
        positionInfo,
      );

      if (!isHrOrAdmin) {
        if (!positionInfo?.departmentId) {
          throw AppError.forbidden("No department scope for this actor");
        }
        const scopedEmployees = await db
          .select({ id: user.id })
          .from(user)
          .where(
            and(
              inArray(user.id, uniqueIds),
              eq(user.departmentId, positionInfo.departmentId),
            ),
          );
        const allowed = new Set(scopedEmployees.map((e) => e.id));
        const filtered = uniqueIds.filter((id) => allowed.has(id));
        if (filtered.length === 0) {
          return {};
        }
        uniqueIds.splice(0, uniqueIds.length, ...filtered);
      }

      const openStatuses = [
        "DUE",
        "SENT_TO_MANAGER",
        "SELF_REVIEW",
        "AWAITING_MANAGER_REVIEW",
        "OVERDUE",
      ] as const;
      const allGoalOrAnnual = await db
        .select({
          id: performanceReview.id,
          employeeId: performanceReview.employeeId,
          reviewType: performanceReview.reviewType,
          status: performanceReview.status,
          updatedAt: performanceReview.updatedAt,
        })
        .from(performanceReview)
        .where(
          and(
            inArray(performanceReview.employeeId, uniqueIds),
            inArray(performanceReview.reviewType, [
              "OBJECTIVE_SETTING",
              "ANNUAL_PERFORMANCE",
            ]),
          ),
        )
        .orderBy(desc(performanceReview.updatedAt));

      const allProbation = await db
        .select({
          id: performanceReview.id,
          employeeId: performanceReview.employeeId,
          probationConfirmationDecision:
            performanceReview.probationConfirmationDecision,
          createdAt: performanceReview.createdAt,
        })
        .from(performanceReview)
        .where(
          and(
            inArray(performanceReview.employeeId, uniqueIds),
            eq(performanceReview.reviewType, "PROBATION"),
          ),
        )
        .orderBy(desc(performanceReview.createdAt));

      const result: Record<
        string,
        {
          activeObjectiveReviewId: string | null;
          activeObjectiveStatus: string | null;
          latestObjectiveReviewId: string | null;
          probationReviewId: string | null;
          probationConfirmationDecision:
            | "CONFIRM_EMPLOYMENT"
            | "EXTEND_PROBATION"
            | "RECOMMEND_TERMINATION"
            | null;
        }
      > = {};

      for (const id of uniqueIds) {
        result[id] = {
          activeObjectiveReviewId: null,
          activeObjectiveStatus: null,
          latestObjectiveReviewId: null,
          probationReviewId: null,
          probationConfirmationDecision: null,
        };
      }

      for (const row of allGoalOrAnnual) {
        const bucket = result[row.employeeId];
        if (!bucket) {
          continue;
        }
        if (!bucket.latestObjectiveReviewId) {
          bucket.latestObjectiveReviewId = row.id;
        }
        if (
          !bucket.activeObjectiveReviewId &&
          row.reviewType === "OBJECTIVE_SETTING" &&
          (openStatuses as readonly string[]).includes(row.status)
        ) {
          bucket.activeObjectiveReviewId = row.id;
          bucket.activeObjectiveStatus = row.status;
        }
      }

      for (const row of allProbation) {
        const bucket = result[row.employeeId];
        if (bucket && !bucket.probationReviewId) {
          bucket.probationReviewId = row.id;
          bucket.probationConfirmationDecision =
            (row.probationConfirmationDecision ?? null) as
              | "CONFIRM_EMPLOYMENT"
              | "EXTEND_PROBATION"
              | "RECOMMEND_TERMINATION"
              | null;
        }
      }

      return result;
    },

    async createObjectiveReviewForEmployee(
      actorId: string,
      employeeId: string,
    ) {
      const role = await getActorRole(db, actorId);
      const positionInfo = await getActorPositionInfo(db, actorId);
      const isHrOrAdmin = role === "HOD_HR" || role === "ADMIN";

      if (!isHrOrAdmin) {
        if (!positionInfo?.departmentId) {
          throw AppError.forbidden("No department scope for this actor");
        }
        const scopedEmployee = await db.query.user.findFirst({
          where: and(eq(user.id, employeeId), eq(user.status, "ACTIVE")),
          columns: { id: true, departmentId: true },
        });
        if (!scopedEmployee) {
          throw AppError.notFound("Employee not found");
        }
        if (scopedEmployee.departmentId !== positionInfo.departmentId) {
          throw AppError.forbidden("Employee is outside your department scope");
        }
      }

      const review = await this.createReview(
        {
          employeeId,
          reviewerId: actorId,
          reviewType: "OBJECTIVE_SETTING",
        },
        actorId,
      );

      return { reviewId: review.id };
    },

    async createObjectiveSettingForEmployee(
      actorId: string,
      input: CreateObjectiveSettingForEmployeeInput,
    ) {
      const role = await getActorRole(db, actorId);
      const positionInfo = await getActorPositionInfo(db, actorId);
      const isHrOrAdmin = role === "HOD_HR" || role === "ADMIN";

      const employee = await assertActiveEmployeeForReview(
        db,
        input.employeeId,
      );

      if (!isHrOrAdmin) {
        if (!positionInfo?.departmentId) {
          throw AppError.forbidden("No department scope for this actor");
        }
        if (employee.departmentId !== positionInfo.departmentId) {
          throw AppError.forbidden("Employee is outside your department scope");
        }
      }

      const review = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(performanceReview)
          .values({
            employeeId: input.employeeId,
            reviewerId: actorId,
            reviewType: "OBJECTIVE_SETTING",
            status: "DUE",
            reviewPeriodStart: input.reviewPeriodStart
              ? new Date(input.reviewPeriodStart)
              : null,
            reviewPeriodEnd: input.reviewPeriodEnd
              ? new Date(input.reviewPeriodEnd)
              : null,
            completionPercentage: 0,
            feedback: {
              objectiveMainGoal: input.objectiveMainGoal,
            },
          })
          .returning();

        if (!created) {
          throw AppError.badRequest("Failed to create objective review");
        }

        await tx.insert(performanceGoal).values(
          input.goals.map((g) => ({
            reviewId: created.id,
            title: g.title,
            description: g.description ?? null,
            weight: g.weight,
            status: "PENDING" as const,
          })),
        );

        return created;
      });

      return { reviewId: review.id };
    },

    async createProbationForEmployee(actorId: string, employeeId: string) {
      const role = await getActorRole(db, actorId);
      const positionInfo = await getActorPositionInfo(db, actorId);
      const isAdmin = role === "ADMIN";
      const employee = await db.query.user.findFirst({
        where: eq(user.id, employeeId),
        columns: { id: true, departmentId: true, joiningDate: true },
      });
      if (!employee) {
        throw AppError.notFound("Employee not found");
      }

      if (!isAdmin) {
        if (!positionInfo?.departmentId) {
          throw AppError.forbidden("No department scope for this actor");
        }
        if (employee.departmentId !== positionInfo.departmentId) {
          throw AppError.forbidden("Employee is outside your department scope");
        }
      }

      const reviewPeriodStart = employee.joiningDate ?? new Date();
      const reviewPeriodEnd = new Date();
      const review = await this.createReview(
        {
          employeeId,
          reviewerId: actorId,
          reviewType: "PROBATION",
          reviewPeriodStart: reviewPeriodStart.toISOString(),
          reviewPeriodEnd: reviewPeriodEnd.toISOString(),
        },
        actorId,
      );
      return { reviewId: review.id };
    },

    /**
     * Submit goal review as annual: convert OBJECTIVE_SETTING review in place to
     * ANNUAL_PERFORMANCE, status SUBMITTED, keeping goal data and adding
     * reflection + goal achievements (achieved %, comment per goal).
     */
    async submitGoalReviewAsAnnual(
      actorId: string,
      input: SubmitGoalReviewAsAnnualInput,
    ) {
      const review = await db.query.performanceReview.findFirst({
        where: eq(performanceReview.id, input.reviewId),
        with: { goals: true },
      });
      if (!review) {
        throw AppError.notFound("Review not found");
      }
      if (review.reviewType !== "OBJECTIVE_SETTING") {
        throw AppError.badRequest(
          "Only a goal (objective) review can be submitted as annual",
        );
      }
      const openStatuses = [
        "DUE",
        "SENT_TO_MANAGER",
        "SELF_REVIEW",
        "AWAITING_MANAGER_REVIEW",
        "OVERDUE",
      ] as const;
      if (
        !openStatuses.includes(review.status as (typeof openStatuses)[number])
      ) {
        throw AppError.badRequest("Goal review is already submitted or closed");
      }
      await assertCanAccessReview(review, actorId);

      const now = new Date();
      const currentFeedback = (
        review.feedback && typeof review.feedback === "object"
          ? (review.feedback as Record<string, unknown>)
          : {}
      ) as Record<string, unknown>;

      // Total completion = sum of (goal weight * achieved%) / 100
      let completionPercentage = 0;
      if (review.goals.length > 0) {
        let sum = 0;
        for (const goal of review.goals) {
          const weight = typeof goal.weight === "number" ? goal.weight : 0;
          const achieved =
            input.goalAchievements[goal.id]?.achievedPercentage ?? 0;
          sum += (weight * achieved) / 100;
        }
        completionPercentage = Math.round(sum);
      }

      return await db.transaction(async (tx) => {
        const goalRows = review.goals
          .map((goal) => {
            const achievement = input.goalAchievements[goal.id];
            if (!achievement) {
              return null;
            }
            return {
              goalId: goal.id,
              comment: achievement.comment ?? null,
            };
          })
          .filter(
            (r): r is { goalId: string; comment: string | null } => r !== null,
          );

        if (goalRows.length > 0) {
          const valueRows = goalRows.map(
            (r) => sql`(${r.goalId}::uuid, ${r.comment})`,
          );
          await tx.execute(sql`
            UPDATE performance_goal AS g
            SET
              updated_at = ${now},
              status = 'COMPLETED',
              comment = v.comment,
              rating = NULL
            FROM (VALUES ${sql.join(valueRows, sql`, `)}) AS v(id, comment)
            WHERE g.id = v.id::uuid
          `);
        }
        await tx
          .update(performanceReview)
          .set({
            reviewType: "ANNUAL_PERFORMANCE",
            status: "SUBMITTED",
            submittedAt: now,
            updatedAt: now,
            completionPercentage,
            selfComment: input.reflection ?? review.selfComment,
            feedback: {
              ...currentFeedback,
              goalAchievements: input.goalAchievements,
            },
          })
          .where(eq(performanceReview.id, input.reviewId));

        return await this.getReview(input.reviewId, actorId);
      });
    },
  };
};

// Export service type for context.ts
export type PerformanceService = ReturnType<typeof createPerformanceService>;
