import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { env } from "../../env";
import {
  o,
  protectedProcedure,
  publicProcedure,
  requireRoles,
} from "../../shared/middleware";
import { getActorRole } from "../../shared/utils";
import {
  batchUpdateCompetenciesSchema,
  createCompetencySchema,
  createCompetencyTemplateSchema,
  createCycleSchema,
  createGoalSchema,
  createReviewSchema,
  deleteGoalSchema,
  getReviewsSchema,
  saveDraftSchema,
  submitReviewSchema,
  transitionReviewSchema,
  updateCompetencySchema,
  updateCycleSchema,
  updateGoalSchema,
  updateReviewSchema,
} from "./performance.schema";

export const performanceRouter = o.router({
  // ==========================================================================
  // Cycle Endpoints
  // ==========================================================================

  /**
   * Create a new performance cycle (HR/Admin only)
   */
  createCycle: requireRoles(["HOD_HR", "ADMIN"])
    .input(createCycleSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      return await context.services.performance.createCycle(input, userId);
    }),

  /**
   * Get all cycles
   */
  getCycles: protectedProcedure.handler(
    async ({ context }) => await context.services.performance.getCycles(),
  ),

  /**
   * Get a single cycle with reviews
   */
  getCycle: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      const cycle = await context.services.performance.getCycle(input.id);
      if (!cycle) {
        throw new ORPCError("NOT_FOUND", { message: "Cycle not found" });
      }
      return cycle;
    }),

  /**
   * Update a cycle (HR/Admin only)
   */
  updateCycle: requireRoles(["HOD_HR", "ADMIN"])
    .input(updateCycleSchema)
    .handler(async ({ input, context }) => {
      try {
        return await context.services.performance.updateCycle(input);
      } catch (error: unknown) {
        if (error instanceof Error && error.message === "NOT_FOUND") {
          throw new ORPCError("NOT_FOUND", { message: "Cycle not found" });
        }
        throw error;
      }
    }),

  // ==========================================================================
  // Review Endpoints
  // ==========================================================================

  /**
   * Create a review for an employee (HR/Admin/Manager)
   */
  createReview: requireRoles(["HOD_HR", "ADMIN", "MANAGER"])
    .input(createReviewSchema)
    .handler(async ({ input, context }) => {
      return await context.services.performance.createReview(input);
    }),

  /**
   * Get a review with all details
   */
  getReview: protectedProcedure
    .input(z.object({ reviewId: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      const review = await context.services.performance.getReview(
        input.reviewId,
        context.session.user.id,
      );
      if (!review) {
        throw new ORPCError("NOT_FOUND", { message: "Review not found" });
      }
      return review;
    }),

  /**
   * Get reviews with filtering
   */
  getReviews: protectedProcedure
    .input(getReviewsSchema)
    .handler(async ({ input, context }) => {
      return await context.services.performance.getReviews(
        input,
        context.session.user.id,
      );
    }),

  /**
   * Get my reviews (as employee)
   */
  getMyReviews: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
      }),
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      return await context.services.performance.getReviews(
        {
          ...input,
          employeeId: userId,
        },
        userId,
      );
    }),

  /**
   * Get reviews I need to complete (as reviewer)
   */
  getPendingReviews: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
      }),
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      return await context.services.performance.getReviews(
        {
          ...input,
          reviewerId: userId,
          status: [
            "DUE",
            "SENT_TO_MANAGER",
            "SELF_REVIEW",
            "AWAITING_MANAGER_REVIEW",
          ],
        },
        userId,
      );
    }),

  // ==========================================================================
  // Operational Dashboard Endpoints
  // ==========================================================================

  /**
   * Get Manager Dashboard summaries
   */
  getManagerDashboard: requireRoles(["MANAGER", "HOD_HR", "ADMIN"]).handler(
    async ({ context }) => {
      const userId = context.session.user.id;
      return await context.services.performance.getManagerDashboard(userId);
    },
  ),

  /**
   * Get HR Dashboard summaries
   */
  getHrDashboard: requireRoles(["HOD_HR", "ADMIN"]).handler(
    async ({ context }) => {
      return await context.services.performance.getHrDashboard();
    },
  ),

  // ==========================================================================
  // Review Execution Endpoints
  // ==========================================================================

  /**
   * Update a review
   */
  updateReview: protectedProcedure
    .input(updateReviewSchema)
    .handler(async ({ input, context }) => {
      try {
        return await context.services.performance.updateReview(
          input,
          context.session.user.id,
        );
      } catch (error: unknown) {
        if (error instanceof Error && error.message === "NOT_FOUND") {
          throw new ORPCError("NOT_FOUND", { message: "Review not found" });
        }
        throw error;
      }
    }),

  /**
   * Save review draft (for auto-save)
   */
  saveDraft: protectedProcedure
    .input(saveDraftSchema)
    .handler(async ({ input, context }) => {
      return await context.services.performance.saveDraft(
        input,
        context.session.user.id,
      );
    }),

  /**
   * Submit a review (validates completeness)
   */
  submitReview: protectedProcedure
    .input(submitReviewSchema)
    .handler(async ({ input, context }) => {
      try {
        const userId = context.session.user.id;
        return await context.services.performance.submitReview(
          input.reviewId,
          userId,
        );
      } catch (error: unknown) {
        if (error instanceof Error) {
          switch (error.message) {
            case "NOT_FOUND":
              throw new ORPCError("NOT_FOUND", { message: "Review not found" });
            case "INCOMPLETE_RATINGS":
              throw new ORPCError("BAD_REQUEST", {
                message: "All competencies must be rated before submitting",
              });
            case "MISSING_JUSTIFICATION":
              throw new ORPCError("BAD_REQUEST", {
                message:
                  "Justification is required for ratings below expectations",
              });
            default:
              throw error;
          }
        }
        throw error;
      }
    }),

  /**
   * State machine driven transition mechanism
   */
  transitionReview: protectedProcedure
    .input(transitionReviewSchema)
    .handler(async ({ input, context }) => {
      return await context.services.performance.transitionReviewStatus(
        input.reviewId,
        input.status,
        context.session.user.id,
        input.payload,
      );
    }),

  // ==========================================================================
  // Competency Endpoints
  // ==========================================================================

  /**
   * Add a competency to a review
   */
  createCompetency: requireRoles(["HOD_HR", "ADMIN"])
    .input(createCompetencySchema)
    .handler(async ({ input, context }) => {
      return await context.services.performance.createCompetency(
        input,
        context.session.user.id,
      );
    }),

  /**
   * Update a competency rating
   */
  updateCompetency: protectedProcedure
    .input(updateCompetencySchema)
    .handler(async ({ input, context }) => {
      try {
        const userId = context.session.user.id;
        return await context.services.performance.updateCompetency(
          input,
          userId,
        );
      } catch (error: unknown) {
        if (error instanceof Error && error.message === "NOT_FOUND") {
          throw new ORPCError("NOT_FOUND", { message: "Competency not found" });
        }
        throw error;
      }
    }),

  /**
   * Batch update competency ratings
   */
  batchUpdateCompetencies: protectedProcedure
    .input(batchUpdateCompetenciesSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      return await context.services.performance.batchUpdateCompetencies(
        input,
        userId,
      );
    }),

  // ==========================================================================
  // Cron Automation
  // ==========================================================================

  /**
   * Run the daily cron job automation for performance reviews
   */
  processCron: publicProcedure
    .route({
      path: "/cron/process",
      method: "POST",
      summary: "Process Daily Performance Rules",
      description:
        "Triggers the daily performance state machine. (Can also be hit securely by external scheduler)",
    })
    .input(
      z.object({
        secret: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const authorizationHeader = context.request.headers.get("authorization");
      const bearerSecret = authorizationHeader?.startsWith("Bearer ")
        ? authorizationHeader.slice(7)
        : authorizationHeader;
      const headerSecret = context.request.headers.get("x-cron-secret");
      const providedSecret = input.secret ?? headerSecret ?? bearerSecret;

      if (
        env.PERFORMANCE_CRON_SECRET &&
        providedSecret === env.PERFORMANCE_CRON_SECRET
      ) {
        return await context.services.performanceCron.runDailyChecks();
      }

      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Cron processing requires a valid session or cron secret",
        });
      }

      if (context.session.user.role === "ADMIN") {
        return await context.services.performanceCron.runDailyChecks();
      }

      const actorRole = await getActorRole(context.db, context.session.user.id);
      if (actorRole !== "HOD_HR") {
        throw new ORPCError("FORBIDDEN", {
          message: "Only Admin or Head of HR can process the performance cron",
        });
      }

      return await context.services.performanceCron.runDailyChecks();
    }),

  // ==========================================================================
  // Goal Endpoints
  // ==========================================================================

  /**
   * Create a goal
   */
  createGoal: protectedProcedure
    .input(createGoalSchema)
    .handler(async ({ input, context }) => {
      return await context.services.performance.createGoal(
        input,
        context.session.user.id,
      );
    }),

  /**
   * Update a goal
   */
  updateGoal: protectedProcedure
    .input(updateGoalSchema)
    .handler(async ({ input, context }) => {
      try {
        return await context.services.performance.updateGoal(
          input,
          context.session.user.id,
        );
      } catch (error: unknown) {
        if (error instanceof Error && error.message === "NOT_FOUND") {
          throw new ORPCError("NOT_FOUND", { message: "Goal not found" });
        }
        throw error;
      }
    }),

  /**
   * Delete a goal
   */
  deleteGoal: protectedProcedure
    .input(deleteGoalSchema)
    .handler(async ({ input, context }) => {
      try {
        return await context.services.performance.deleteGoal(
          input.goalId,
          context.session.user.id,
        );
      } catch (error: unknown) {
        if (error instanceof Error && error.message === "NOT_FOUND") {
          throw new ORPCError("NOT_FOUND", { message: "Goal not found" });
        }
        throw error;
      }
    }),

  /**
   * Get goals for a review
   */
  getGoals: protectedProcedure
    .input(z.object({ reviewId: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      return await context.services.performance.getGoals(
        input.reviewId,
        context.session.user.id,
      );
    }),

  // ==========================================================================
  // Template Endpoints
  // ==========================================================================

  /**
   * Create a competency template (HR/Admin only)
   */
  createCompetencyTemplate: requireRoles(["HOD_HR", "ADMIN"])
    .input(createCompetencyTemplateSchema)
    .handler(async ({ input, context }) => {
      return await context.services.performance.createCompetencyTemplate(input);
    }),

  /**
   * Get competency templates
   */
  getCompetencyTemplates: protectedProcedure
    .input(
      z.object({
        reviewType: z
          .enum(["PROBATION", "ANNUAL_PERFORMANCE", "OBJECTIVE_SETTING"])
          .optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return await context.services.performance.getCompetencyTemplates(
        input.reviewType,
      );
    }),
});
