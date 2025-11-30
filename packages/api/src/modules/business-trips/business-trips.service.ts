import type { db as _db } from "@zenith-hr/db";
import { businessTrip, tripExpense } from "@zenith-hr/db/schema/business-trips";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type {
  addExpenseSchema,
  createTripSchema,
  tripActionSchema,
} from "./business-trips.schema";

type CreateTripInput = z.infer<typeof createTripSchema>;
type TripActionInput = z.infer<typeof tripActionSchema>;
type AddExpenseInput = z.infer<typeof addExpenseSchema>;

export const createBusinessTripsService = (db: typeof _db) => ({
  async create(input: CreateTripInput, requesterId: string) {
    const [trip] = await db
      .insert(businessTrip)
      .values({
        requesterId,
        destination: input.destination,
        purpose: input.purpose,
        startDate: input.startDate,
        endDate: input.endDate,
        estimatedCost: input.estimatedCost?.toString(),
        currency: input.currency,
        status: "PENDING_MANAGER",
      })
      .returning();
    if (!trip) {
      throw new Error("Failed to create trip");
    }
    return trip;
  },

  async getById(id: string) {
    const [trip] = await db
      .select()
      .from(businessTrip)
      .where(eq(businessTrip.id, id))
      .limit(1);
    return trip;
  },

  async getByRequester(requesterId: string) {
    return await db
      .select()
      .from(businessTrip)
      .where(eq(businessTrip.requesterId, requesterId));
  },

  async transition(input: TripActionInput, _actorId: string) {
    const [trip] = await db
      .select()
      .from(businessTrip)
      .where(eq(businessTrip.id, input.tripId))
      .limit(1);

    if (!trip) {
      throw new Error("NOT_FOUND");
    }

    let newStatus = trip.status;
    const currentStatus = trip.status;

    if (input.action === "SUBMIT" && currentStatus === "DRAFT") {
      newStatus = "PENDING_MANAGER";
    } else if (input.action === "APPROVE") {
      switch (currentStatus) {
        case "PENDING_MANAGER":
          newStatus = "PENDING_HR";
          break;
        case "PENDING_HR":
          newStatus = "PENDING_FINANCE";
          break;
        case "PENDING_FINANCE":
          newStatus = "APPROVED";
          break;
        default:
          throw new Error("INVALID_TRANSITION");
      }
    } else if (input.action === "REJECT") {
      newStatus = "REJECTED";
    } else if (input.action === "CANCEL") {
      newStatus = "CANCELLED";
    }

    const [updated] = await db
      .update(businessTrip)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(businessTrip.id, input.tripId))
      .returning();

    if (!updated) {
      throw new Error("Failed to update trip");
    }
    return updated;
  },

  async addExpense(input: AddExpenseInput) {
    const [expense] = await db
      .insert(tripExpense)
      .values({
        tripId: input.tripId,
        category: input.category,
        amount: input.amount.toString(),
        currency: input.currency,
        date: input.date,
        description: input.description,
        receiptUrl: input.receiptUrl,
      })
      .returning();
    if (!expense) {
      throw new Error("Failed to add expense");
    }
    return expense;
  },

  async getExpenses(tripId: string) {
    return await db
      .select()
      .from(tripExpense)
      .where(eq(tripExpense.tripId, tripId));
  },
});

export type BusinessTripsService = ReturnType<
  typeof createBusinessTripsService
>;
