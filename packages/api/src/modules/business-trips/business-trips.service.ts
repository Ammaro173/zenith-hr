import type { DbOrTx } from "@zenith-hr/db";
import { approvalLog } from "@zenith-hr/db/schema/approval-logs";
import { auditLog } from "@zenith-hr/db/schema/audit-logs";
import { user } from "@zenith-hr/db/schema/auth";
import {
  businessTrip,
  tripExpense,
  type tripStatusEnum,
} from "@zenith-hr/db/schema/business-trips";
import { and, asc, count, desc, eq, ilike, inArray } from "drizzle-orm";
import type { z } from "zod";
import { AppError } from "../../shared/errors";
import { notifyUser } from "../../shared/notify";
import type { ApprovalAction, RequestStatus } from "../../shared/types";
import { getActorRole } from "../../shared/utils";
import type {
  addExpenseSchema,
  createTripSchema,
  getMyTripsSchema,
  tripActionSchema,
} from "./business-trips.schema";

type BusinessTripStatus = (typeof tripStatusEnum.enumValues)[number];

type CreateTripInput = z.infer<typeof createTripSchema>;
type TripActionInput = z.infer<typeof tripActionSchema>;
type AddExpenseInput = z.infer<typeof addExpenseSchema>;

import type { WorkflowService } from "../workflow/workflow.service";

export const createBusinessTripsService = (
  db: DbOrTx,
  workflowService: WorkflowService,
) => ({
  async create(input: CreateTripInput, requesterId: string) {
    if (input.startDate > input.endDate) {
      throw AppError.badRequest("End date must be after start date");
    }

    const requesterRole = await getActorRole(db, requesterId);
    let initialStatus: RequestStatus = "PENDING_MANAGER";

    // Skip logical steps if the requester is already in that role
    if (requesterRole === "MANAGER") {
      initialStatus = "PENDING_HR";
    } else if (requesterRole === "HR") {
      initialStatus = "PENDING_FINANCE";
    }

    // Determine initial approver
    const initialApproverId = await workflowService.getNextApproverIdForStatus(
      requesterId,
      initialStatus,
    );

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
        status: initialStatus as BusinessTripStatus, // Cast is safe because logic ensures it's a valid subset
        currentApproverId: initialApproverId,
        currentApproverRole:
          workflowService.getApproverForStatus(initialStatus),
      })
      .returning();
    if (!trip) {
      throw AppError.badRequest("Failed to create trip");
    }
    return trip;
  },

  async getById(id: string) {
    const [trip] = await db
      .select({
        id: businessTrip.id,
        requesterId: businessTrip.requesterId,
        delegatedUserId: businessTrip.delegatedUserId,
        destination: businessTrip.destination,
        purpose: businessTrip.purpose,
        startDate: businessTrip.startDate,
        endDate: businessTrip.endDate,
        estimatedCost: businessTrip.estimatedCost,
        currency: businessTrip.currency,
        visaRequired: businessTrip.visaRequired,
        needsFlightBooking: businessTrip.needsFlightBooking,
        needsHotelBooking: businessTrip.needsHotelBooking,
        perDiemAllowance: businessTrip.perDiemAllowance,
        status: businessTrip.status,
        currentApproverId: businessTrip.currentApproverId,
        currentApproverRole: businessTrip.currentApproverRole,
        revisionVersion: businessTrip.revisionVersion,
        version: businessTrip.version,
        createdAt: businessTrip.createdAt,
        updatedAt: businessTrip.updatedAt,
        requester: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
      })
      .from(businessTrip)
      .innerJoin(user, eq(businessTrip.requesterId, user.id))
      .where(eq(businessTrip.id, id))
      .limit(1);

    if (!trip) {
      return null;
    }

    // Fetch delegated user if exists
    let delegatedUser: { id: string; name: string | null } | null = null;
    if (trip.delegatedUserId) {
      const [u] = await db
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(eq(user.id, trip.delegatedUserId))
        .limit(1);
      delegatedUser = u || null;
    }

    // Fetch current approver if exists
    let currentApprover: { id: string; name: string | null } | null = null;
    if (trip.currentApproverId) {
      const [u] = await db
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(eq(user.id, trip.currentApproverId))
        .limit(1);
      currentApprover = u || null;
    }

    return {
      ...trip,
      delegatedUser,
      currentApprover,
    };
  },

  async getByRequester(
    requesterId: string,
    params: z.infer<typeof getMyTripsSchema>,
  ) {
    const { page, pageSize, search, status, sortBy, sortOrder } = params;

    // Base conditions
    const conditions = [eq(businessTrip.requesterId, requesterId)];

    if (status?.length) {
      conditions.push(inArray(businessTrip.status, status));
    }

    if (search) {
      conditions.push(
        ilike(
          businessTrip.destination,
          ` % $;
{
  search;
}
%`,
        ),
      );
    }

    const offset = (page - 1) * pageSize;

    // Determine sort column
    const orderFn = sortOrder === "desc" ? desc : asc;
    const orderBy = orderFn(
      businessTrip[sortBy as keyof typeof businessTrip._.columns],
    );

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(businessTrip)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: count() })
        .from(businessTrip)
        .where(and(...conditions)),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      data,
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
    };
  },

  async getPendingApprovals(userId: string) {
    const actorRole = await getActorRole(db, userId);
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
    return await db.transaction(async (tx) => {
      const [trip] = await tx
        .select()
        .from(businessTrip)
        .where(eq(businessTrip.id, input.tripId))
        .limit(1);

      if (!trip) {
        throw AppError.notFound("Trip not found");
      }

      const actorRole = await getActorRole(tx, actorId);
      const currentStatus = trip.status as BusinessTripStatus;
      let newStatus: BusinessTripStatus = currentStatus;

      // Validate actor is the current approver (unless it's a cancellation/submission by requester)
      const isRequester = trip.requesterId === actorId;

      if (input.action === "CANCEL") {
        if (!isRequester && actorRole !== "ADMIN") {
          throw new AppError(
            "FORBIDDEN",
            "Only requester or admin can cancel",
            403,
          );
        }
        newStatus = "CANCELLED";
      } else if (input.action === "SUBMIT") {
        if (!isRequester) {
          throw new AppError("FORBIDDEN", "Only requester can submit", 403);
        }
        if (currentStatus !== "DRAFT") {
          throw AppError.badRequest("Invalid status transition");
        }
        newStatus = "PENDING_MANAGER";
      } else {
        // Approval flow
        if (trip.currentApproverId !== actorId && actorRole !== "ADMIN") {
          throw new AppError("FORBIDDEN", "Not authorized to approve", 403);
        }

        if (input.action === "APPROVE") {
          switch (currentStatus) {
            case "PENDING_MANAGER":
              newStatus = "PENDING_HR";
              break;
            case "PENDING_HR":
              newStatus = "PENDING_FINANCE";
              break;
            case "PENDING_FINANCE":
              newStatus = "PENDING_CEO";
              break;
            case "PENDING_CEO":
              newStatus = "APPROVED";
              break;
            default:
              throw AppError.badRequest("Invalid status transition");
          }
        } else if (input.action === "REJECT") {
          newStatus = "REJECTED";
        }
      }

      if (newStatus === currentStatus && input.action !== "SUBMIT") {
        // allow idempotent saves if needed
      }

      // Determine next approver using WorkflowService
      const nextApproverId = await workflowService.getNextApproverIdForStatus(
        trip.requesterId,
        newStatus,
      );

      const [updated] = await tx
        .update(businessTrip)
        .set({
          status: newStatus,
          currentApproverId: nextApproverId,
          currentApproverRole: workflowService.getApproverForStatus(newStatus),
          updatedAt: new Date(),
          version: trip.version + 1,
        })
        .where(
          and(
            eq(businessTrip.id, input.tripId),
            eq(businessTrip.version, trip.version),
          ),
        )
        .returning();

      if (!updated) {
        throw new AppError(
          "CONFLICT",
          "Version mismatch - please refresh",
          409,
        );
      }

      // Audit logs
      await tx.insert(auditLog).values({
        entityId: input.tripId,
        entityType: "BUSINESS_TRIP",
        action: input.action,
        performedBy: actorId,
        performedAt: new Date(),
        metadata: {
          from: currentStatus,
          to: newStatus,
          comment: input.comment,
        },
      });

      // Approval Logs (history)
      await tx.insert(approvalLog).values({
        requestId: input.tripId,
        actorId,
        action: input.action as ApprovalAction,
        stepName: currentStatus,
        comment: input.comment,
        performedAt: new Date(),
      });

      // Notifications...
      // Note: notifyUser is a side effect. Ideally run AFTER commit.
      // But for simplicity/pattern matching, keeping here.
      await notifyUser({
        userId: trip.requesterId,
        message: `Business trip ${trip.destination} updated to ${newStatus}`,
      });

      if (nextApproverId && nextApproverId !== trip.requesterId) {
        await notifyUser({
          userId: nextApproverId,
          message: `New Business Trip Approval Required: ${trip.destination}`,
        });
      }

      return updated;
    });
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
      throw AppError.badRequest("Failed to add expense");
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

  async canUserEdit(tripId: string, userId: string): Promise<boolean> {
    const [trip] = await db
      .select()
      .from(businessTrip)
      .where(eq(businessTrip.id, tripId))
      .limit(1);

    if (!trip) {
      return false;
    }

    // Only requester can edit, and only if in DRAFT status
    return trip.requesterId === userId && trip.status === "DRAFT";
  },
});

export type BusinessTripsService = ReturnType<
  typeof createBusinessTripsService
>;
