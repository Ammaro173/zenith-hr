import { relations } from "drizzle-orm";
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

export const notificationTypeEnum = pgEnum("notification_type", [
  "INFO",
  "ACTION_REQUIRED",
  "REMINDER",
]);

export const notificationOutboxStatusEnum = pgEnum(
  "notification_outbox_status",
  ["PENDING", "SENDING", "SENT", "FAILED"],
);

export const notification = pgTable("notification", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull().default("INFO"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  link: text("link"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationOutbox = pgTable("notification_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  payload: jsonb("payload").notNull(),
  status: notificationOutboxStatusEnum("status").notNull().default("PENDING"),
  nextAttemptAt: timestamp("next_attempt_at").defaultNow().notNull(),
  attemptCount: integer("attempt_count").notNull().default(0),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, {
    fields: [notification.userId],
    references: [user.id],
  }),
}));

export const notificationOutboxRelations = relations(
  notificationOutbox,
  ({ one }) => ({
    user: one(user, {
      fields: [notificationOutbox.userId],
      references: [user.id],
    }),
  }),
);
