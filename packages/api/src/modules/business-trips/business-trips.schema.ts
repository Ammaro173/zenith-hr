import { z } from "zod";

export const TRIP_PURPOSE_OPTIONS = [
  { value: "CLIENT_MEETING", label: "Client Meeting" },
  { value: "BUSINESS_DEVELOPMENT", label: "Business Development" },
  { value: "CONFERENCE_EXHIBITION", label: "Conference/Exhibition" },
  { value: "TRAINING_WORKSHOP", label: "Training/Workshop" },
  { value: "SITE_VISIT_INSPECTION", label: "Site Visit/Inspection" },
  { value: "PROJECT_MEETING", label: "Project Meeting" },
  { value: "PARTNERSHIP_NEGOTIATION", label: "Partnership Negotiation" },
  { value: "INTERNAL_MEETING", label: "Internal Meeting" },
  { value: "OTHER", label: "Other (specify)" },
] as const;

export const tripPurposeValues = [
  "CLIENT_MEETING",
  "BUSINESS_DEVELOPMENT",
  "CONFERENCE_EXHIBITION",
  "TRAINING_WORKSHOP",
  "SITE_VISIT_INSPECTION",
  "PROJECT_MEETING",
  "PARTNERSHIP_NEGOTIATION",
  "INTERNAL_MEETING",
  "OTHER",
] as const;

export const TRAVEL_CLASS_OPTIONS = [
  { value: "ECONOMY", label: "Economy" },
  { value: "BUSINESS", label: "Business" },
  { value: "FIRST", label: "First" },
] as const;

/** Air Ticket / Hotel arrangement: Company, Employee, or Third Party */
export const TRIP_ARRANGEMENT_PARTY_VALUES = [
  "COMPANY",
  "EMPLOYEE",
  "THIRD_PARTY",
] as const;

export const AIR_TICKET_BOOKED_BY_OPTIONS = [
  { value: "COMPANY", label: "Company" },
  { value: "EMPLOYEE", label: "Employee" },
  { value: "THIRD_PARTY", label: "Third Party" },
] as const;

export const HOTEL_ARRANGED_BY_OPTIONS = [
  { value: "COMPANY", label: "Company" },
  { value: "EMPLOYEE", label: "Employee" },
  { value: "THIRD_PARTY", label: "Third Party" },
] as const;

export const TRIP_STATUSES = [
  "DRAFT",
  "PENDING_MANAGER",
  "PENDING_HOD",
  "PENDING_HR",
  "PENDING_FINANCE",
  "PENDING_CEO",
  "CHANGE_REQUESTED",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
  "CANCELLED",
] as const;

// Base schema without refinements (needed for .partial() in Zod v4)
const baseTripSchema = z.object({
  // Destination (split into country + city)
  country: z.string().min(1, "Country is required"),
  city: z.string().min(1, "City is required"),

  // Purpose
  purposeType: z.enum(tripPurposeValues),
  purposeDetails: z.string().optional(),

  startDate: z.date(),
  endDate: z.date(),
  visaRequired: z.boolean(),
  needsFlightBooking: z.boolean(),
  needsHotelBooking: z.boolean(),
  perDiemAllowance: z.number().positive().optional(),
  estimatedCost: z.number().positive().optional(),
  currency: z.string(),

  // Flight details (optional, conditionally required when needsFlightBooking)
  departureCity: z.string().optional(),
  arrivalCity: z.string().optional(),
  preferredDepartureDate: z.date().optional(),
  preferredArrivalDate: z.date().optional(),
  travelClass: z.string().optional(),
  flightNotes: z.string().optional(),

  // Optional: employee covering duties during travel (null to clear).
  replacementDuringTravelUserId: z
    .union([z.string().min(1), z.literal(""), z.null(), z.undefined()])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),

  // Optional: who books air ticket / arranges hotel
  airTicketBookedBy: z.enum(TRIP_ARRANGEMENT_PARTY_VALUES).optional(),
  hotelArrangedBy: z.enum(TRIP_ARRANGEMENT_PARTY_VALUES).optional(),
  // Optional: address and contact during trip
  addressDuringTrip: z.string().optional(),
  contactDetailsDuringTrip: z.string().optional(),
});

// Create schema with date validation and conditional flight validation
export const createTripSchema = baseTripSchema
  .refine(
    (data) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return data.startDate >= today;
    },
    {
      message: "Trip dates cannot be in the past",
      path: ["startDate"],
    },
  )
  .refine((data) => data.startDate <= data.endDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  })
  .refine(
    (data) => {
      if (data.needsFlightBooking) {
        return (
          data.departureCity &&
          data.departureCity.length > 0 &&
          data.arrivalCity &&
          data.arrivalCity.length > 0
        );
      }
      return true;
    },
    {
      message:
        "Departure city and arrival city are required when flight booking is selected",
      path: ["departureCity"],
    },
  )
  .refine(
    (data) => {
      if (data.purposeType === "OTHER") {
        return data.purposeDetails && data.purposeDetails.length > 0;
      }
      return true;
    },
    {
      message: "Please provide details when purpose is 'Other'",
      path: ["purposeDetails"],
    },
  );

// Update schema uses partial of the base (without refinement)
export const updateTripSchema = baseTripSchema.partial();

export const createTripDefaults: z.input<typeof baseTripSchema> = {
  country: "",
  city: "",
  purposeType: "CLIENT_MEETING",
  purposeDetails: "",
  startDate: new Date(),
  endDate: new Date(),
  visaRequired: false,
  needsFlightBooking: false,
  needsHotelBooking: false,
  perDiemAllowance: undefined,
  estimatedCost: undefined,
  currency: "QAR",
  departureCity: "",
  arrivalCity: "",
  preferredDepartureDate: undefined,
  preferredArrivalDate: undefined,
  travelClass: "",
  flightNotes: "",
  replacementDuringTravelUserId: undefined,
  airTicketBookedBy: undefined,
  hotelArrangedBy: undefined,
  addressDuringTrip: "",
  contactDetailsDuringTrip: "",
};

export const tripActionSchema = z.object({
  tripId: z.string().uuid(),
  action: z.enum(["SUBMIT", "APPROVE", "REJECT", "REQUEST_CHANGE", "CANCEL"]),
  comment: z.string().optional(),
});

export const EXPENSE_CATEGORY_VALUES = [
  "FLIGHT",
  "HOTEL",
  "MEAL",
  "TRANSPORT",
  "OTHER",
] as const;

export const EXPENSE_CATEGORY_OPTIONS: {
  value: (typeof EXPENSE_CATEGORY_VALUES)[number];
  label: string;
}[] = [
  { value: "FLIGHT", label: "Flight" },
  { value: "HOTEL", label: "Hotel" },
  { value: "MEAL", label: "Meal" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "OTHER", label: "Other" },
];

export const addExpenseSchema = z.object({
  tripId: z.string().uuid(),
  category: z.enum(EXPENSE_CATEGORY_VALUES),
  amount: z.number().positive(),
  currency: z.string().default("QAR"),
  date: z.date(),
  description: z.string().optional(),
  receiptUrl: z.string().optional(),
});

export const getMyTripsSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.array(z.enum(TRIP_STATUSES)).optional(),
  sortBy: z
    .enum(["createdAt", "country", "status", "startDate", "estimatedCost"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type GetMyTripsInput = z.infer<typeof getMyTripsSchema>;
