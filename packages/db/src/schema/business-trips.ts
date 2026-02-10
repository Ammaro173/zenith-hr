import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { approvalLog } from "./approval-logs";
import { user, userRoleEnum } from "./auth";

export const tripStatusEnum = pgEnum("trip_status", [
  "DRAFT",
  "PENDING_MANAGER",
  "PENDING_HR",
  "PENDING_FINANCE",
  "PENDING_CEO",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
  "CANCELLED",
]);

export const tripPurposeEnum = pgEnum("trip_purpose", [
  "CLIENT_MEETING",
  "BUSINESS_DEVELOPMENT",
  "CONFERENCE_EXHIBITION",
  "TRAINING_WORKSHOP",
  "SITE_VISIT_INSPECTION",
  "PROJECT_MEETING",
  "PARTNERSHIP_NEGOTIATION",
  "INTERNAL_MEETING",
  "OTHER",
]);

export const businessTrip = pgTable("business_trip", {
  id: uuid("id").primaryKey().defaultRandom(),
  requesterId: text("requester_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  delegatedUserId: text("delegated_user_id").references(() => user.id, {
    onDelete: "set null",
  }),

  // Destination (split into country + city)
  country: text("country").notNull(),
  city: text("city").notNull(),

  // Purpose (enum + optional details)
  purposeType: tripPurposeEnum("purpose_type").notNull(),
  purposeDetails: text("purpose_details"),

  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  visaRequired: boolean("visa_required").notNull().default(false),
  needsFlightBooking: boolean("needs_flight_booking").notNull().default(false),
  needsHotelBooking: boolean("needs_hotel_booking").notNull().default(false),
  perDiemAllowance: decimal("per_diem_allowance", { precision: 10, scale: 2 }),
  status: tripStatusEnum("status").default("DRAFT").notNull(),

  // Approval Workflow Fields
  currentApproverId: text("current_approver_id").references(() => user.id, {
    onDelete: "set null",
  }),
  currentApproverRole: userRoleEnum("current_approver_role"),
  revisionVersion: integer("revision_version").notNull().default(0),
  version: integer("version").notNull().default(0), // For optimistic locking

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
    approvalLogs: many(approvalLog),
  }),
);

export const tripExpenseRelations = relations(tripExpense, ({ one }) => ({
  trip: one(businessTrip, {
    fields: [tripExpense.tripId],
    references: [businessTrip.id],
  }),
}));
