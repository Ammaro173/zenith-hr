import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const importHistory = pgTable("import_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(), // 'users' | 'departments'
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  filename: text("filename"),
  totalRows: integer("total_rows").notNull(),
  insertedCount: integer("inserted_count").notNull().default(0),
  updatedCount: integer("updated_count").notNull().default(0),
  skippedCount: integer("skipped_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  upsertMode: boolean("upsert_mode").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const importHistoryItem = pgTable("import_history_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  importHistoryId: uuid("import_history_id")
    .notNull()
    .references(() => importHistory.id, { onDelete: "cascade" }),
  rowNumber: integer("row_number").notNull(),
  identifier: text("identifier").notNull(), // email for users, name for departments
  status: text("status").notNull(), // 'inserted' | 'updated' | 'skipped' | 'failed'
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const importHistoryRelations = relations(
  importHistory,
  ({ one, many }) => ({
    user: one(user, {
      fields: [importHistory.userId],
      references: [user.id],
    }),
    items: many(importHistoryItem),
  }),
);

export const importHistoryItemRelations = relations(
  importHistoryItem,
  ({ one }) => ({
    importHistory: one(importHistory, {
      fields: [importHistoryItem.importHistoryId],
      references: [importHistory.id],
    }),
  }),
);
