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
import { user } from "./auth";
import { jobPosition } from "./position-slots";
import { positionRoleEnum } from "./users";

export const tripStatusEnum = pgEnum("trip_status", [
  "DRAFT",
  "PENDING_MANAGER",
  "PENDING_HOD",
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
  requesterPositionId: uuid("requester_position_id").references(
    () => jobPosition.id,
    {
      onDelete: "set null",
    },
  ),

  // Destination (split into country + city)
  country: text("country").notNull(),
  city: text("city").notNull(),

  // Purpose (enum + optional details)
  purposeType: tripPurposeEnum("purpose_type").notNull(),
  purposeDetails: text("purpose_details"),

  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  currency: text("currency").default("QAR"),
  visaRequired: boolean("visa_required").notNull().default(false),
  needsFlightBooking: boolean("needs_flight_booking").notNull().default(false),
  needsHotelBooking: boolean("needs_hotel_booking").notNull().default(false),
  perDiemAllowance: decimal("per_diem_allowance", { precision: 10, scale: 2 }),

  // Flight details (only relevant when needsFlightBooking is true)
  departureCity: text("departure_city"),
  arrivalCity: text("arrival_city"),
  preferredDepartureDate: timestamp("preferred_departure_date"),
  preferredArrivalDate: timestamp("preferred_arrival_date"),
  travelClass: text("travel_class"),
  flightNotes: text("flight_notes"),

  status: tripStatusEnum("status").default("DRAFT").notNull(),

  // Approval Workflow Fields
  currentApproverPositionId: uuid("current_approver_position_id").references(
    () => jobPosition.id,
    {
      onDelete: "set null",
    },
  ),
  requiredApproverRole: positionRoleEnum("required_approver_role"),

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
  currency: text("currency").default("QAR"),
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
    requesterPosition: one(jobPosition, {
      fields: [businessTrip.requesterPositionId],
      references: [jobPosition.id],
    }),
    currentApproverPosition: one(jobPosition, {
      fields: [businessTrip.currentApproverPositionId],
      references: [jobPosition.id],
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
