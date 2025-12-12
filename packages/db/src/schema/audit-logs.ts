import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityId: text("entity_id").notNull(),
  entityType: text("entity_type").notNull(),
  action: text("action").notNull(),
  metadata: jsonb("metadata"),
  performedBy: text("performed_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  performedAt: timestamp("performed_at").notNull().defaultNow(),
});

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  actor: one(user, {
    fields: [auditLog.performedBy],
    references: [user.id],
  }),
}));
