import { relations } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { department } from "./departments";
import { jobDescription } from "./job-descriptions";

export const jobPosition = pgTable(
  "job_position",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    departmentId: uuid("department_id").references(() => department.id, {
      onDelete: "set null",
    }),
    jobDescriptionId: uuid("job_description_id").references(
      () => jobDescription.id,
      {
        onDelete: "set null",
      },
    ),
    reportsToPositionId: uuid("reports_to_position_id"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    codeIdx: index("job_position_code_idx").on(table.code),
    departmentIdx: index("job_position_department_idx").on(table.departmentId),
    jobDescriptionIdx: index("job_position_job_description_idx").on(
      table.jobDescriptionId,
    ),
    reportsToIdx: index("job_position_reports_to_idx").on(
      table.reportsToPositionId,
    ),
    reportsToFk: foreignKey({
      columns: [table.reportsToPositionId],
      foreignColumns: [table.id],
    }).onDelete("set null"),
  }),
);

export const userPositionAssignment = pgTable(
  "user_position_assignment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    positionId: uuid("position_id")
      .notNull()
      .references(() => jobPosition.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    positionIdx: index("user_position_assignment_position_idx").on(
      table.positionId,
    ),
    userIdx: uniqueIndex("user_position_assignment_user_unique").on(
      table.userId,
    ),
  }),
);

export const positionSlot = jobPosition;
export const slotAssignment = userPositionAssignment;

export const jobPositionRelations = relations(jobPosition, ({ one, many }) => ({
  department: one(department, {
    fields: [jobPosition.departmentId],
    references: [department.id],
  }),
  jobDescription: one(jobDescription, {
    fields: [jobPosition.jobDescriptionId],
    references: [jobDescription.id],
  }),
  reportsTo: one(jobPosition, {
    fields: [jobPosition.reportsToPositionId],
    references: [jobPosition.id],
    relationName: "job_position_reports_to",
  }),
  reports: many(jobPosition, {
    relationName: "job_position_reports_to",
  }),
  assignments: many(userPositionAssignment),
}));

export const userPositionAssignmentRelations = relations(
  userPositionAssignment,
  ({ one }) => ({
    position: one(jobPosition, {
      fields: [userPositionAssignment.positionId],
      references: [jobPosition.id],
    }),
    user: one(user, {
      fields: [userPositionAssignment.userId],
      references: [user.id],
    }),
  }),
);

export const positionSlotRelations = jobPositionRelations;
export const slotAssignmentRelations = userPositionAssignmentRelations;
