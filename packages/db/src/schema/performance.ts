import { relations } from "drizzle-orm";
import {
  decimal,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

// ============================================================================
// Enums
// ============================================================================

export const performanceCycleStatusEnum = pgEnum("performance_cycle_status", [
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
]);

export const performanceReviewStatusEnum = pgEnum("performance_review_status", [
  "DRAFT",
  "SELF_REVIEW",
  "MANAGER_REVIEW",
  "IN_REVIEW",
  "SUBMITTED",
  "ACKNOWLEDGED",
  "COMPLETED",
]);

export const performanceReviewTypeEnum = pgEnum("performance_review_type", [
  "PROBATION",
  "ANNUAL_PERFORMANCE",
  "OBJECTIVE_SETTING",
]);

export const performanceGoalStatusEnum = pgEnum("performance_goal_status", [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

// ============================================================================
// Tables
// ============================================================================

/**
 * Performance Cycle - A defined period for reviews (e.g., Q1 2025, Annual 2025)
 */
export const performanceCycle = pgTable("performance_cycle", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: performanceCycleStatusEnum("status").default("DRAFT").notNull(),
  createdById: text("created_by_id").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Performance Review - An individual employee's review within a cycle
 */
export const performanceReview = pgTable("performance_review", {
  id: uuid("id").primaryKey().defaultRandom(),
  cycleId: uuid("cycle_id")
    .notNull()
    .references(() => performanceCycle.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  reviewerId: text("reviewer_id").references(() => user.id, {
    onDelete: "set null",
  }),
  reviewType: performanceReviewTypeEnum("review_type")
    .default("ANNUAL_PERFORMANCE")
    .notNull(),
  status: performanceReviewStatusEnum("status").default("DRAFT").notNull(),
  // Review period (may differ from cycle dates for probation reviews)
  reviewPeriodStart: timestamp("review_period_start"),
  reviewPeriodEnd: timestamp("review_period_end"),
  // Ratings and Comments
  overallRating: decimal("overall_rating", { precision: 3, scale: 2 }), // 1.00 - 5.00 scale
  managerComment: text("manager_comment"),
  selfComment: text("self_comment"),
  // Additional feedback as JSON for flexibility
  feedback: jsonb("feedback"),
  // Calculated fields
  totalScore: decimal("total_score", { precision: 5, scale: 2 }),
  completionPercentage: integer("completion_percentage").default(0),
  // Timestamps
  submittedAt: timestamp("submitted_at"),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Performance Competency - Core competencies to rate in a review
 * Each review has multiple competencies with weighted ratings
 */
export const performanceCompetency = pgTable("performance_competency", {
  id: uuid("id").primaryKey().defaultRandom(),
  reviewId: uuid("review_id")
    .notNull()
    .references(() => performanceReview.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  weight: integer("weight").default(20).notNull(), // Percentage weight (all should sum to 100)
  rating: integer("rating"), // 1-5 scale
  justification: text("justification"), // Required when rating < 3 (below expectations)
  ratedById: text("rated_by_id").references(() => user.id, {
    onDelete: "set null",
  }),
  ratedAt: timestamp("rated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Performance Goal - Future goals set during a review
 */
export const performanceGoal = pgTable("performance_goal", {
  id: uuid("id").primaryKey().defaultRandom(),
  reviewId: uuid("review_id")
    .notNull()
    .references(() => performanceReview.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: timestamp("target_date"),
  weight: integer("weight").default(0), // Optional percentage weight
  rating: integer("rating"), // 1-5 scale (for completed goals)
  comment: text("comment"),
  status: performanceGoalStatusEnum("status").default("PENDING").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Competency Template - Reusable competency definitions
 * HR can create templates that are copied to reviews when created
 */
export const competencyTemplate = pgTable("competency_template", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  weight: integer("weight").default(20).notNull(),
  category: text("category"), // e.g., "Technical", "Leadership", "Communication"
  reviewType: performanceReviewTypeEnum("review_type"), // null = applies to all
  isActive: integer("is_active").default(1).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================================
// Relations
// ============================================================================

export const performanceCycleRelations = relations(
  performanceCycle,
  ({ one, many }) => ({
    createdBy: one(user, {
      fields: [performanceCycle.createdById],
      references: [user.id],
    }),
    reviews: many(performanceReview),
  }),
);

export const performanceReviewRelations = relations(
  performanceReview,
  ({ one, many }) => ({
    cycle: one(performanceCycle, {
      fields: [performanceReview.cycleId],
      references: [performanceCycle.id],
    }),
    employee: one(user, {
      fields: [performanceReview.employeeId],
      references: [user.id],
      relationName: "employeeReviews",
    }),
    reviewer: one(user, {
      fields: [performanceReview.reviewerId],
      references: [user.id],
      relationName: "reviewerReviews",
    }),
    competencies: many(performanceCompetency),
    goals: many(performanceGoal),
  }),
);

export const performanceCompetencyRelations = relations(
  performanceCompetency,
  ({ one }) => ({
    review: one(performanceReview, {
      fields: [performanceCompetency.reviewId],
      references: [performanceReview.id],
    }),
    ratedBy: one(user, {
      fields: [performanceCompetency.ratedById],
      references: [user.id],
    }),
  }),
);

export const performanceGoalRelations = relations(
  performanceGoal,
  ({ one }) => ({
    review: one(performanceReview, {
      fields: [performanceGoal.reviewId],
      references: [performanceReview.id],
    }),
  }),
);

export const competencyTemplateRelations = relations(
  competencyTemplate,
  () => ({}),
);

// ============================================================================
// Type Exports
// ============================================================================

export type PerformanceCycle = typeof performanceCycle.$inferSelect;
export type NewPerformanceCycle = typeof performanceCycle.$inferInsert;

export type PerformanceReview = typeof performanceReview.$inferSelect;
export type NewPerformanceReview = typeof performanceReview.$inferInsert;

export type PerformanceCompetency = typeof performanceCompetency.$inferSelect;
export type NewPerformanceCompetency =
  typeof performanceCompetency.$inferInsert;

export type PerformanceGoal = typeof performanceGoal.$inferSelect;
export type NewPerformanceGoal = typeof performanceGoal.$inferInsert;

export type CompetencyTemplate = typeof competencyTemplate.$inferSelect;
export type NewCompetencyTemplate = typeof competencyTemplate.$inferInsert;
