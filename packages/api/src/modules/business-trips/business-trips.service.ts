import type { DbOrTx } from "@zenith-hr/db";
import { approvalLog } from "@zenith-hr/db/schema/approval-logs";
import { auditLog } from "@zenith-hr/db/schema/audit-logs";
import { user } from "@zenith-hr/db/schema/auth";
import {
  businessTrip,
  tripExpense,
  type tripStatusEnum,
} from "@zenith-hr/db/schema/business-trips";
import { department } from "@zenith-hr/db/schema/departments";
import { and, asc, count, desc, eq, ilike, inArray } from "drizzle-orm";
import type { z } from "zod";
import { AppError } from "../../shared/errors";
import { notifyUser } from "../../shared/notify";
import type {
  ApprovalAction,
  RequestStatus,
  UserRole,
} from "../../shared/types";
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

// 1. Initial Status Strategy on Create
const INITIAL_STATUS_MAP: Partial<Record<UserRole, RequestStatus>> = {
  MANAGER: "PENDING_HR",
  HR: "PENDING_FINANCE",
  FINANCE: "PENDING_CEO",
  // Default fallback is PENDING_MANAGER (handled in code)
};

// 2. Pending Approvals View Strategy
const PENDING_VIEW_MAP: Partial<Record<UserRole, BusinessTripStatus>> = {
  MANAGER: "PENDING_MANAGER",
  HR: "PENDING_HR",
  FINANCE: "PENDING_FINANCE",
  CEO: "PENDING_CEO",
};

// 3. Status Transition Strategy (State Machine)
const NEXT_STATUS_MAP: Partial<Record<BusinessTripStatus, BusinessTripStatus>> =
  {
    PENDING_MANAGER: "PENDING_HR",
    PENDING_HR: "PENDING_FINANCE",
    PENDING_FINANCE: "PENDING_CEO",
    PENDING_CEO: "APPROVED",
  };

// 4. Approval Action Strategy
const APPROVAL_TRANSITION_MAP: Partial<
  Record<
    TripActionInput["action"],
    (status: BusinessTripStatus) => BusinessTripStatus
  >
> = {
  REJECT: () => "REJECTED",
  APPROVE: (status) => {
    const nextState = NEXT_STATUS_MAP[status];
    if (!nextState) {
      throw AppError.badRequest(
        `Invalid approval transition from status: ${status}`,
      );
    }
    return nextState;
  },
};

export const createBusinessTripsService = (
  db: DbOrTx,
  workflowService: WorkflowService,
) => ({
  async create(input: CreateTripInput, requesterId: string) {
    if (input.startDate > input.endDate) {
      throw AppError.badRequest("End date must be after start date");
    }

    const requesterRole = await getActorRole(db, requesterId);

    // Determine initial status based on role map, default to PENDING_MANAGER
    // (If user is ADMIN or REQUESTER or others not in map, they start at PENDING_MANAGER logic)
    // Note: The original logic had:
    // if MANAGER -> PENDING_HR
    // if HR -> PENDING_FINANCE
    // others -> PENDING_MANAGER
    const initialStatus =
      INITIAL_STATUS_MAP[requesterRole as UserRole] || "PENDING_MANAGER";

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
        status: initialStatus as BusinessTripStatus,
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
      conditions.push(ilike(businessTrip.destination, `%${search}%`));
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
    const actorRole = (await getActorRole(db, userId)) as UserRole;
    const statusFilter = PENDING_VIEW_MAP[actorRole];

    if (!statusFilter) {
      return [];
    }

    return await db
      .select()
      .from(businessTrip)
      .where(
        and(
          eq(businessTrip.status, statusFilter),
          eq(businessTrip.currentApproverId, userId),
        ),
      );
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

      const isRequester = trip.requesterId === actorId;

      // Handle CANCEL
      if (input.action === "CANCEL") {
        if (!isRequester && actorRole !== "ADMIN") {
          throw new AppError(
            "FORBIDDEN",
            "Only requester or admin can cancel",
            403,
          );
        }
        newStatus = "CANCELLED";
      }
      // Handle SUBMIT
      else if (input.action === "SUBMIT") {
        if (!isRequester) {
          throw new AppError("FORBIDDEN", "Only requester can submit", 403);
        }
        if (currentStatus !== "DRAFT") {
          throw AppError.badRequest(
            `Invalid status transition from ${currentStatus}`,
          );
        }
        newStatus = "PENDING_MANAGER";
      }
      // Handle APPROVE / REJECT (Approval Flow)
      else {
        // Validation: must be current approver or ADMIN
        if (trip.currentApproverId !== actorId && actorRole !== "ADMIN") {
          throw new AppError("FORBIDDEN", "Not authorized to approve", 403);
        }

        const strategy = APPROVAL_TRANSITION_MAP[input.action];
        if (strategy) {
          newStatus = strategy(currentStatus);
        }
      }

      // Allow idempotent saves if status unchanged, except for submits
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
