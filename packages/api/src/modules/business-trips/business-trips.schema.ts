import { z } from "zod";

// Base schema without refinements (needed for .partial() in Zod v4)
const baseTripSchema = z.object({
  destination: z.string().min(1),
  purpose: z.string().min(1),
  startDate: z.date(),
  endDate: z.date(),
  delegatedUserId: z.string().min(1).optional(),
  visaRequired: z.boolean(),
  needsFlightBooking: z.boolean(),
  needsHotelBooking: z.boolean(),
  perDiemAllowance: z.number().positive().optional(),
  estimatedCost: z.number().positive().optional(),
  currency: z.string(),
});

// Create schema with date validation refinement
export const createTripSchema = baseTripSchema.refine(
  (data) => data.startDate <= data.endDate,
  {
    message: "End date must be after start date",
    path: ["endDate"],
  },
);

// Update schema uses partial of the base (without refinement)
export const updateTripSchema = baseTripSchema.partial();

export const createTripDefaults: z.infer<typeof createTripSchema> = {
  destination: "",
  purpose: "",
  startDate: new Date(),
  endDate: new Date(),
  delegatedUserId: undefined,
  visaRequired: false,
  needsFlightBooking: false,
  needsHotelBooking: false,
  perDiemAllowance: undefined,
  estimatedCost: undefined,
  currency: "USD",
};

export const tripActionSchema = z.object({
  tripId: z.string().uuid(),
  action: z.enum(["SUBMIT", "APPROVE", "REJECT", "CANCEL"]),
  comment: z.string().optional(),
});

export const addExpenseSchema = z.object({
  tripId: z.string().uuid(),
  category: z.enum(["FLIGHT", "HOTEL", "MEAL", "TRANSPORT", "OTHER"]),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  date: z.date(),
  description: z.string().optional(),
  receiptUrl: z.string().optional(),
});

export const getMyTripsSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z
    .array(
      z.enum([
        "DRAFT",
        "PENDING_MANAGER",
        "PENDING_HR",
        "PENDING_FINANCE",
        "PENDING_CEO",
        "APPROVED",
        "REJECTED",
        "COMPLETED",
        "CANCELLED",
      ]),
    )
    .optional(),
  sortBy: z
    .enum(["createdAt", "destination", "status", "startDate", "estimatedCost"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type GetMyTripsInput = z.infer<typeof getMyTripsSchema>;
