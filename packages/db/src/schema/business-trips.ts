import { relations } from "drizzle-orm";
import {
  decimal,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const tripStatusEnum = pgEnum("trip_status", [
  "DRAFT",
  "PENDING_MANAGER",
  "PENDING_HR",
  "PENDING_FINANCE",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
  "CANCELLED",
]);

export const businessTrip = pgTable("business_trip", {
  id: uuid("id").primaryKey().defaultRandom(),
  requesterId: text("requester_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  destination: text("destination").notNull(),
  purpose: text("purpose").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  status: tripStatusEnum("status").default("DRAFT").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tripExpense = pgTable("trip_expense", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => businessTrip.id, { onDelete: "cascade" }),
  category: text("category").notNull(), // Flight, Hotel, Meal, Transport
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  date: timestamp("date").notNull(),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const businessTripRelations = relations(
  businessTrip,
  ({ one, many }) => ({
    requester: one(user, {
      fields: [businessTrip.requesterId],
      references: [user.id],
    }),
    expenses: many(tripExpense),
  })
);

export const tripExpenseRelations = relations(tripExpense, ({ one }) => ({
  trip: one(businessTrip, {
    fields: [tripExpense.tripId],
    references: [businessTrip.id],
  }),
}));
