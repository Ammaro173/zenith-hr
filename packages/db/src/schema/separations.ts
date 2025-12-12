import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const separationRequest = pgTable("separation_request", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: text("employee_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: ["RESIGNATION", "TERMINATION", "RETIREMENT", "END_OF_CONTRACT"],
  }).notNull(),
  reason: text("reason").notNull(),
  lastWorkingDay: date("last_working_day").notNull(),
  noticePeriodWaived: boolean("notice_period_waived").notNull().default(false),
  status: text("status", {
    enum: [
      "REQUESTED",
      "MANAGER_APPROVED",
      "HR_APPROVED",
      "CLEARANCE_IN_PROGRESS",
      "COMPLETED",
      "REJECTED",
    ],
  })
    .default("REQUESTED")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const separationChecklist = pgTable("separation_checklist", {
  id: uuid("id").primaryKey().defaultRandom(),
  separationId: uuid("separation_id")
    .notNull()
    .references(() => separationRequest.id, { onDelete: "cascade" }),
  department: text("department", {
    enum: ["IT", "HR", "FINANCE", "ADMIN"],
  }).notNull(),
  item: text("item").notNull(),
  status: text("status", { enum: ["PENDING", "CLEARED", "REJECTED"] })
    .default("PENDING")
    .notNull(),
  completedBy: text("completed_by").references(() => user.id, {
    onDelete: "set null",
  }),
  completedAt: timestamp("completed_at"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const separationRequestRelations = relations(
  separationRequest,
  ({ one, many }) => ({
    employee: one(user, {
      fields: [separationRequest.employeeId],
      references: [user.id],
    }),
    checklistItems: many(separationChecklist),
  })
);

export const separationChecklistRelations = relations(
  separationChecklist,
  ({ one }) => ({
    separationRequest: one(separationRequest, {
      fields: [separationChecklist.separationId],
      references: [separationRequest.id],
    }),
    completedByUser: one(user, {
      fields: [separationChecklist.completedBy],
      references: [user.id],
    }),
  })
);
