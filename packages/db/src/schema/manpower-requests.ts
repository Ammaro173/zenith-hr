import {
  decimal,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user, userRoleEnum } from "./auth";

export const manpowerRequestSeq = pgSequence("manpower_requests_seq", {
  startWith: 1,
});

export const requestStatusEnum = pgEnum("request_status", [
  "DRAFT",
  "PENDING_MANAGER",
  "PENDING_HR",
  "PENDING_FINANCE",
  "PENDING_CEO",
  "APPROVED_OPEN",
  "HIRING_IN_PROGRESS",
  "REJECTED",
  "ARCHIVED",
  "APPROVED",
  "COMPLETED",
  "CANCELLED",
]);

export const requestTypeEnum = pgEnum("request_type", [
  "NEW_POSITION",
  "REPLACEMENT",
]);

export const contractDurationEnum = pgEnum("contract_duration", [
  "FULL_TIME",
  "TEMPORARY",
  "CONSULTANT",
]);

export const manpowerRequest = pgTable("manpower_request", {
  id: uuid("id").primaryKey().defaultRandom(),
  requesterId: text("requester_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  requestCode: text("request_code").notNull().unique(),
  status: requestStatusEnum("status").notNull().default("DRAFT"),
  requestType: requestTypeEnum("request_type").notNull(),
  replacementForUserId: text("replacement_for_user_id").references(
    () => user.id,
    {
      onDelete: "set null",
    },
  ),
  contractDuration: contractDurationEnum("contract_duration").notNull(),
  justificationText: text("justification_text").notNull(),
  salaryRangeMin: decimal("salary_range_min", {
    precision: 12,
    scale: 2,
  }).notNull(),
  salaryRangeMax: decimal("salary_range_max", {
    precision: 12,
    scale: 2,
  }).notNull(),
  currentApproverId: text("current_approver_id").references(() => user.id, {
    onDelete: "set null",
  }),
  currentApproverRole: userRoleEnum("current_approver_role"),
  positionDetails: jsonb("position_details").notNull(),
  budgetDetails: jsonb("budget_details").notNull(),
  revisionVersion: integer("revision_version").notNull().default(0),
  version: integer("version").notNull().default(0), // For optimistic locking
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations will be defined after all schemas are imported
