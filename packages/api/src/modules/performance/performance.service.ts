import {
  performanceCycle,
  performanceGoal,
  performanceReview,
} from "@zenith-hr/db";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type {
  createCycleSchema,
  createGoalSchema,
  createReviewSchema,
  updateGoalSchema,
  updateReviewSchema,
} from "./performance.schema";

export const createPerformanceService = (
  db: typeof import("@zenith-hr/db").db
) => ({
  async createCycle(input: z.infer<typeof createCycleSchema>) {
    const [cycle] = await db
      .insert(performanceCycle)
      .values({
        name: input.name,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        status: "DRAFT",
      })
      .returning();
    if (!cycle) {
      throw new Error("Failed to create cycle");
    }
    return cycle;
  },

  async getCycles() {
    return await db.query.performanceCycle.findMany({
      orderBy: (cycles, { desc }) => [desc(cycles.createdAt)],
    });
  },

  async getCycle(id: string) {
    const [cycle] = await db
      .select()
      .from(performanceCycle)
      .where(eq(performanceCycle.id, id))
      .limit(1);
    return cycle;
  },

  async createReview(input: z.infer<typeof createReviewSchema>) {
    const [review] = await db
      .insert(performanceReview)
      .values({
        cycleId: input.cycleId,
        employeeId: input.employeeId,
        reviewerId: input.reviewerId,
        status: "DRAFT",
      })
      .returning();
    if (!review) {
      throw new Error("Failed to create review");
    }
    return review;
  },

  async getReview(reviewId: string) {
    return await db.query.performanceReview.findFirst({
      where: eq(performanceReview.id, reviewId),
      with: {
        cycle: true,
        employee: true,
        reviewer: true,
        goals: true,
      },
    });
  },

  async updateReview(input: z.infer<typeof updateReviewSchema>) {
    const [updated] = await db
      .update(performanceReview)
      .set({
        overallRating: input.overallRating,
        overallComment: input.overallComment,
        feedback: input.feedback,
        updatedAt: new Date(),
      })
      .where(eq(performanceReview.id, input.reviewId))
      .returning();
    if (!updated) {
      throw new Error("Failed to update review");
    }
    return updated;
  },

  async createGoal(input: z.infer<typeof createGoalSchema>) {
    const [goal] = await db
      .insert(performanceGoal)
      .values({
        reviewId: input.reviewId,
        title: input.title,
        description: input.description,
        weight: input.weight,
        status: "PENDING",
      })
      .returning();
    if (!goal) {
      throw new Error("Failed to create goal");
    }
    return goal;
  },

  async updateGoal(input: z.infer<typeof updateGoalSchema>) {
    const [updated] = await db
      .update(performanceGoal)
      .set({
        rating: input.rating,
        comment: input.comment,
        status: input.status,
        updatedAt: new Date(),
      })
      .where(eq(performanceGoal.id, input.goalId))
      .returning();
    if (!updated) {
      throw new Error("Failed to update goal");
    }
    return updated;
  },
});
