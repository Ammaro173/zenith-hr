import type { db as _db } from "@zenith-hr/db";
import { auditLog } from "@zenith-hr/db/schema/audit-logs";
import { user } from "@zenith-hr/db/schema/auth";
import {
  businessTrip,
  tripExpense,
  type tripStatusEnum,
} from "@zenith-hr/db/schema/business-trips";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { notifyUser } from "../../shared/notify";
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
    if (input.startDate > input.endDate) {
      throw new Error("INVALID_DATES");
    }

    const [requester] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, requesterId))
      .limit(1);

    const requesterRole = (requester?.role || "REQUESTER") as string;
    let initialStatus: (typeof tripStatusEnum.enumValues)[number] =
      "PENDING_MANAGER";
    if (requesterRole === "MANAGER") {
      initialStatus = "PENDING_HR";
    } else if (requesterRole === "HR") {
      initialStatus = "PENDING_FINANCE";
    }

    const [trip] = await db
      .insert(businessTrip)
      .values({
        requesterId,
        delegatedUserId: input.delegatedUserId,
        destination: input.destination,
        purpose: input.purpose,
        startDate: input.startDate,
        endDate: input.endDate,
        estimatedCost: input.estimatedCost?.toString(),
        currency: input.currency,
        visaRequired: input.visaRequired,
        needsFlightBooking: input.needsFlightBooking,
        needsHotelBooking: input.needsHotelBooking,
        perDiemAllowance: input.perDiemAllowance?.toString(),
        status: initialStatus,
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

  async getPendingApprovals(userId: string) {
    const [actor] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    const actorRole = (actor?.role || "REQUESTER") as string;
    let statusFilter: (typeof tripStatusEnum.enumValues)[number] | null = null;
    if (actorRole === "MANAGER") {
      statusFilter = "PENDING_MANAGER";
    } else if (actorRole === "HR") {
      statusFilter = "PENDING_HR";
    } else if (actorRole === "FINANCE") {
      statusFilter = "PENDING_FINANCE";
    }

    if (!statusFilter) {
      return [];
    }

    return await db
      .select()
      .from(businessTrip)
      .where(eq(businessTrip.status, statusFilter));
  },

  async transition(input: TripActionInput, actorId: string) {
    const [trip] = await db
      .select()
      .from(businessTrip)
      .where(eq(businessTrip.id, input.tripId))
      .limit(1);

    if (!trip) {
      throw new Error("NOT_FOUND");
    }

    const [actor] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, actorId))
      .limit(1);

    const actorRole = (actor?.role || "REQUESTER") as string;
    let newStatus = trip.status;
    const currentStatus = trip.status;

    const approverForStatus: Record<string, string | null> = {
      PENDING_MANAGER: "MANAGER",
      PENDING_HR: "HR",
      PENDING_FINANCE: "FINANCE",
    };

    const requiredRole = approverForStatus[currentStatus] || null;

    if (
      (input.action === "APPROVE" || input.action === "REJECT") &&
      requiredRole &&
      actorRole !== requiredRole
    ) {
      throw new Error("FORBIDDEN");
    }

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

    if (newStatus === currentStatus) {
      throw new Error("INVALID_TRANSITION");
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

    await db.insert(auditLog).values({
      entityId: input.tripId,
      entityType: "BUSINESS_TRIP",
      action: input.action,
      performedBy: actorId,
      performedAt: new Date(),
      metadata: {
        from: currentStatus,
        to: newStatus,
      },
    });

    await notifyUser({
      userId: trip.requesterId,
      message: `Business trip ${trip.destination} moved to ${newStatus}`,
    });
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

  calculateAllowance(perDiem: number, startDate: Date, endDate: Date) {
    const msInDay = 1000 * 60 * 60 * 24;
    const days = Math.max(
      1,
      Math.floor((endDate.getTime() - startDate.getTime()) / msInDay) + 1,
    );
    return perDiem * days;
  },
});

export type BusinessTripsService = ReturnType<
  typeof createBusinessTripsService
>;
