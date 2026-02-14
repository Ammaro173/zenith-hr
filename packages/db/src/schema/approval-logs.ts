import { relations } from "drizzle-orm";
import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { businessTrip } from "./business-trips";
import { manpowerRequest } from "./manpower-requests";
import { positionSlot } from "./position-slots";

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
  requestId: uuid("request_id").notNull(),
  actorId: text("actor_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  actorSlotId: uuid("actor_slot_id").references(() => positionSlot.id, {
    onDelete: "set null",
  }),
  action: approvalActionEnum("action").notNull(),
  comment: text("comment"),
  stepName: text("step_name").notNull(),
  performedAt: timestamp("performed_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
});

export const approvalLogRelations = relations(approvalLog, ({ one }) => ({
  manpowerRequest: one(manpowerRequest, {
    fields: [approvalLog.requestId],
    references: [manpowerRequest.id],
  }),
  businessTrip: one(businessTrip, {
    fields: [approvalLog.requestId],
    references: [businessTrip.id],
  }),
  actor: one(user, {
    fields: [approvalLog.actorId],
    references: [user.id],
  }),
  actorSlot: one(positionSlot, {
    fields: [approvalLog.actorSlotId],
    references: [positionSlot.id],
  }),
}));
