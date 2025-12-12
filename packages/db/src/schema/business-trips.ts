import { relations } from "drizzle-orm";
import {
  boolean,
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
  delegatedUserId: text("delegated_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  destination: text("destination").notNull(),
  purpose: text("purpose").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  visaRequired: boolean("visa_required").notNull().default(false),
  needsFlightBooking: boolean("needs_flight_booking").notNull().default(false),
  needsHotelBooking: boolean("needs_hotel_booking").notNull().default(false),
  perDiemAllowance: decimal("per_diem_allowance", { precision: 10, scale: 2 }),
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
    delegatedUser: one(user, {
      fields: [businessTrip.delegatedUserId],
      references: [user.id],
      relationName: "delegatedTrips",
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
