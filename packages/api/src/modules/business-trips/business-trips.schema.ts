import { z } from "zod";

export const createTripSchema = z
  .object({
    destination: z.string().min(1),
    purpose: z.string().min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    delegatedUserId: z.string().uuid(),
    visaRequired: z.boolean().default(false),
    needsFlightBooking: z.boolean().default(false),
    needsHotelBooking: z.boolean().default(false),
    perDiemAllowance: z.number().positive().optional(),
    estimatedCost: z.number().positive().optional(),
    currency: z.string().default("USD"),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export const updateTripSchema = createTripSchema.partial();

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
  date: z.coerce.date(),
  description: z.string().optional(),
  receiptUrl: z.string().optional(),
});
