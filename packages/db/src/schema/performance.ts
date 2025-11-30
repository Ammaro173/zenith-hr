import { relations } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const performanceCycle = pgTable("performance_cycle", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status", { enum: ["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"] })
    .default("DRAFT")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
  status: text("status", {
    enum: ["DRAFT", "SUBMITTED", "IN_REVIEW", "COMPLETED", "ACKNOWLEDGED"],
  })
    .default("DRAFT")
    .notNull(),
  overallRating: integer("overall_rating"), // 1-5 scale
  overallComment: text("overall_comment"),
  feedback: jsonb("feedback"), // Flexible JSON for additional feedback questions
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const performanceGoal = pgTable("performance_goal", {
  id: uuid("id").primaryKey().defaultRandom(),
  reviewId: uuid("review_id")
    .notNull()
    .references(() => performanceReview.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  weight: integer("weight").default(0), // Percentage
  rating: integer("rating"), // 1-5 scale
  comment: text("comment"),
  status: text("status", {
    enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
  })
    .default("PENDING")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const performanceCycleRelations = relations(
  performanceCycle,
  ({ many }) => ({
    reviews: many(performanceReview),
  })
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
    goals: many(performanceGoal),
  })
);

export const performanceGoalRelations = relations(
  performanceGoal,
  ({ one }) => ({
    review: one(performanceReview, {
      fields: [performanceGoal.reviewId],
      references: [performanceReview.id],
    }),
  })
);
