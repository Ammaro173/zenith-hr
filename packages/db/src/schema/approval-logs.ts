import { relations } from "drizzle-orm";
import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { manpowerRequest } from "./manpower-requests";

export const approvalActionEnum = pgEnum("approval_action", [
  "SUBMIT",
  "APPROVE",
  "REJECT",
  "REQUEST_CHANGE",
  "HOLD",
  "ARCHIVE",
  "CANCEL",
]);

export const approvalLog = pgTable("approval_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => manpowerRequest.id, { onDelete: "cascade" }),
  actorId: text("actor_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  action: approvalActionEnum("action").notNull(),
  comment: text("comment"),
  stepName: text("step_name").notNull(),
  performedAt: timestamp("performed_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
});

export const approvalLogRelations = relations(approvalLog, ({ one }) => ({
  request: one(manpowerRequest, {
    fields: [approvalLog.requestId],
    references: [manpowerRequest.id],
  }),
  actor: one(user, {
    fields: [approvalLog.actorId],
    references: [user.id],
  }),
}));
