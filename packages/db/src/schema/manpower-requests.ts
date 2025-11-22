import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

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
]);

export const manpowerRequest = pgTable("manpower_request", {
  id: uuid("id").primaryKey().defaultRandom(),
  requesterId: text("requester_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  requestCode: text("request_code").notNull().unique(),
  status: requestStatusEnum("status").notNull().default("DRAFT"),
  positionDetails: jsonb("position_details").notNull(),
  budgetDetails: jsonb("budget_details").notNull(),
  revisionVersion: integer("revision_version").notNull().default(0),
  version: integer("version").notNull().default(0), // For optimistic locking
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations will be defined after all schemas are imported
