import { relations } from "drizzle-orm";
import { integer, jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { manpowerRequest } from "./manpower-requests";

export const requestVersion = pgTable("request_version", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => manpowerRequest.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  snapshotData: jsonb("snapshot_data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const requestVersionRelations = relations(requestVersion, ({ one }) => ({
  request: one(manpowerRequest, {
    fields: [requestVersion.requestId],
    references: [manpowerRequest.id],
  }),
}));
