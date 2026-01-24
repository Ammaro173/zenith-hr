import type { DbOrTx } from "@zenith-hr/db";
import {
  competencyTemplate,
  performanceCompetency,
  performanceCycle,
  performanceGoal,
  performanceReview,
} from "@zenith-hr/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { z } from "zod";
import { AppError } from "../../shared/errors";
import type {
  batchUpdateCompetenciesSchema,
  createCompetencySchema,
  createCompetencyTemplateSchema,
  createCycleSchema,
  createGoalSchema,
  createReviewSchema,
  GetReviewsInput,
  saveDraftSchema,
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

// ============================================================================
// Service Factory
// ============================================================================

export const createPerformanceService = (db: DbOrTx) => ({
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
          status: "DRAFT",
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
  async getReview(reviewId: string) {
    return await db.query.performanceReview.findFirst({
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
  },

  /**
   * Get reviews with filtering and pagination
   */
  async getReviews(params: GetReviewsInput) {
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
    if (cycleId) {
      conditions.push(eq(performanceReview.cycleId, cycleId));
    }

    if (employeeId) {
      conditions.push(eq(performanceReview.employeeId, employeeId));
    }
    if (reviewerId) {
      conditions.push(eq(performanceReview.reviewerId, reviewerId));
    }
    if (status && status.length > 0) {
      conditions.push(inArray(performanceReview.status, status));
    }
    if (reviewType && reviewType.length > 0) {
      conditions.push(inArray(performanceReview.reviewType, reviewType));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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
   * Update a review
   */
  async updateReview(input: UpdateReviewInput) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.status) {
      updateData.status = input.status;
    }
    if (input.managerComment !== undefined) {
      updateData.managerComment = input.managerComment;
    }
    if (input.selfComment !== undefined) {
      updateData.selfComment = input.selfComment;
    }
    if (input.overallRating) {
      updateData.overallRating = String(input.overallRating);
    }
    if (input.feedback) {
      updateData.feedback = input.feedback;
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
  async saveDraft(input: SaveDraftInput) {
    return await db.transaction(async (tx) => {
      // Update review fields
      if (
        input.managerComment !== undefined ||
        input.selfComment !== undefined
      ) {
        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (input.managerComment !== undefined) {
          updateData.managerComment = input.managerComment;
        }
        if (input.selfComment !== undefined) {
          updateData.selfComment = input.selfComment;
        }
        await tx
          .update(performanceReview)
          .set(updateData)
          .where(eq(performanceReview.id, input.reviewId));
      }

      // Update competency ratings
      if (input.competencyRatings && input.competencyRatings.length > 0) {
        for (const rating of input.competencyRatings) {
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
        const ratedCount = competencies.filter((c) => c.rating !== null).length;
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
    return await db.transaction(async (tx) => {
      // Get review with competencies
      const review = await tx.query.performanceReview.findFirst({
        where: eq(performanceReview.id, reviewId),
        with: { competencies: true },
      });

      if (!review) {
        throw AppError.notFound("Review not found");
      }

      // Validate all competencies are rated
      const unratedCompetencies = review.competencies.filter((c) => !c.rating);
      if (unratedCompetencies.length > 0) {
        throw AppError.badRequest("All competencies must be rated");
      }

      // Validate justification for low ratings
      const lowRatingsWithoutJustification = review.competencies.filter(
        (c) => c.rating && c.rating < 3 && !c.justification,
      );
      if (lowRatingsWithoutJustification.length > 0) {
        throw AppError.badRequest("Low ratings require justification");
      }

      // Calculate total score inline
      let totalScore = 0;
      const ratedCompetencies = review.competencies.filter(
        (c) => c.rating !== null,
      );
      if (ratedCompetencies.length > 0) {
        let totalWeight = 0;
        let weightedSum = 0;

        for (const comp of ratedCompetencies) {
          totalWeight += comp.weight;
          weightedSum += (comp.rating ?? 0) * comp.weight;
        }

        if (totalWeight > 0) {
          totalScore = Math.round((weightedSum / totalWeight) * 100) / 100;
        }
      }

      // Update review status
      const [updated] = await tx
        .update(performanceReview)
        .set({
          status: "SUBMITTED",
          totalScore: String(totalScore),
          completionPercentage: 100,
          submittedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(performanceReview.id, reviewId))
        .returning();

      return updated;
    });
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
  async createCompetency(input: CreateCompetencyInput) {
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
      for (const comp of input.competencies) {
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
        const ratedCount = competencies.filter((c) => c.rating !== null).length;
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
  async createGoal(input: CreateGoalInput) {
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
  async updateGoal(input: UpdateGoalInput) {
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
  async deleteGoal(goalId: string) {
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
  async getGoals(reviewId: string) {
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
});

// Export service type for context.ts
export type PerformanceService = ReturnType<typeof createPerformanceService>;
