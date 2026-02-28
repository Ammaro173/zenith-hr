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
import { userPositionAssignment } from "@zenith-hr/db/schema/position-slots";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import type { z } from "zod";
import { AppError } from "../../shared/errors";
import { notifyUser } from "../../shared/notify";
import type { ApprovalAction, PositionRole } from "../../shared/types";
import { getActorPositionInfo, getActorRole } from "../../shared/utils";
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

    // Get requester position info using shared utility
    const requesterPosInfo = await getActorPositionInfo(db, requesterId);
    if (!requesterPosInfo?.positionId) {
      throw new AppError(
        "BAD_REQUEST",
        "Requester must have an assigned position",
        400,
      );
    }

    // Get initial approver using new trip workflow
    const nextApprover = await workflowService.getNextTripApprover(
      requesterPosInfo.positionId,
      "DRAFT",
      db,
    );

    const [trip] = await db
      .insert(businessTrip)
      .values({
        requesterId,
        requesterPositionId: requesterPosInfo.positionId,
        country: input.country,
        city: input.city,
        purposeType: input.purposeType,
        purposeDetails: input.purposeDetails,
        startDate: input.startDate,
        endDate: input.endDate,
        estimatedCost: input.estimatedCost?.toString(),
        currency: input.currency,
        visaRequired: input.visaRequired,
        needsFlightBooking: input.needsFlightBooking,
        needsHotelBooking: input.needsHotelBooking,
        perDiemAllowance: input.perDiemAllowance?.toString(),
        departureCity: input.departureCity,
        arrivalCity: input.arrivalCity,
        preferredDepartureDate: input.preferredDepartureDate,
        preferredArrivalDate: input.preferredArrivalDate,
        travelClass: input.travelClass,
        flightNotes: input.flightNotes,
        status: nextApprover.nextStatus as BusinessTripStatus,
        currentApproverPositionId: nextApprover.approverPositionId,
        requiredApproverRole: nextApprover.approverRole,
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
        requesterPositionId: businessTrip.requesterPositionId,
        country: businessTrip.country,
        city: businessTrip.city,
        purposeType: businessTrip.purposeType,
        purposeDetails: businessTrip.purposeDetails,
        startDate: businessTrip.startDate,
        endDate: businessTrip.endDate,
        estimatedCost: businessTrip.estimatedCost,
        currency: businessTrip.currency,
        visaRequired: businessTrip.visaRequired,
        needsFlightBooking: businessTrip.needsFlightBooking,
        needsHotelBooking: businessTrip.needsHotelBooking,
        perDiemAllowance: businessTrip.perDiemAllowance,
        departureCity: businessTrip.departureCity,
        arrivalCity: businessTrip.arrivalCity,
        preferredDepartureDate: businessTrip.preferredDepartureDate,
        preferredArrivalDate: businessTrip.preferredArrivalDate,
        travelClass: businessTrip.travelClass,
        flightNotes: businessTrip.flightNotes,
        status: businessTrip.status,
        currentApproverPositionId: businessTrip.currentApproverPositionId,
        requiredApproverRole: businessTrip.requiredApproverRole,
        revisionVersion: businessTrip.revisionVersion,
        version: businessTrip.version,
        createdAt: businessTrip.createdAt,
        updatedAt: businessTrip.updatedAt,
        requester: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          sapNo: user.sapNo,
          role: user.role,
        },
        departmentName: department.name,
      })
      .from(businessTrip)
      .innerJoin(user, eq(businessTrip.requesterId, user.id))
      .leftJoin(department, eq(user.departmentId, department.id))
      .where(eq(businessTrip.id, id))
      .limit(1);

    if (!trip) {
      return null;
    }

    // Fetch current approver position users if exists
    let currentApprover: { id: string; name: string | null } | null = null;
    if (trip.currentApproverPositionId) {
      const [assignment] = await db
        .select({ userId: userPositionAssignment.userId, userName: user.name })
        .from(userPositionAssignment)
        .innerJoin(user, eq(userPositionAssignment.userId, user.id))
        .where(
          eq(userPositionAssignment.positionId, trip.currentApproverPositionId),
        )
        .limit(1);
      if (assignment) {
        currentApprover = {
          id: assignment.userId,
          name: assignment.userName,
        };
      }
    }

    return {
      ...trip,
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
      conditions.push(ilike(businessTrip.country, `%${search}%`));
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
    const actorPosInfo = await getActorPositionInfo(db, userId);
    if (!actorPosInfo) {
      return [];
    }

    const actorRole = await getActorRole(db, userId);
    const isSharedQueueRole = ["HOD_HR", "HOD_FINANCE", "CEO"].includes(
      actorRole,
    );

    // Build visibility conditions based on position
    const visibilityConditions: ReturnType<typeof eq>[] = [];

    // Check if actor's position matches current approver position
    if (actorPosInfo.positionId) {
      visibilityConditions.push(
        eq(businessTrip.currentApproverPositionId, actorPosInfo.positionId),
      );
    }

    // For shared queue roles, check by required role
    if (isSharedQueueRole && actorPosInfo.positionRole) {
      visibilityConditions.push(
        eq(
          businessTrip.requiredApproverRole,
          actorPosInfo.positionRole as PositionRole,
        ),
      );
    }

    if (visibilityConditions.length === 0) {
      return [];
    }

    // Get all trips visible to this user
    const items = await db
      .select({
        trip: businessTrip,
        requester: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
      })
      .from(businessTrip)
      .innerJoin(user, eq(businessTrip.requesterId, user.id))
      .where(
        and(
          // Only show actionable pending trips in approvals (exclude REJECTED)
          or(
            eq(businessTrip.status, "PENDING_MANAGER"),
            eq(businessTrip.status, "PENDING_HOD"),
            eq(businessTrip.status, "PENDING_HR"),
            eq(businessTrip.status, "PENDING_FINANCE"),
            eq(businessTrip.status, "PENDING_CEO"),
            // eq(businessTrip.status, "REJECTED"),
          ),
          or(...visibilityConditions),
        ),
      )
      .orderBy(desc(businessTrip.createdAt));

    return items.map((item) => ({
      ...item.trip,
      requester: item.requester,
    }));
  },

  async transition(input: TripActionInput, actorId: string) {
    // Execute transaction first to persist state changes
    const result = await db.transaction(async (tx) => {
      const [trip] = await tx
        .select()
        .from(businessTrip)
        .where(eq(businessTrip.id, input.tripId))
        .limit(1);

      if (!trip) {
        throw AppError.notFound("Trip not found");
      }

      const actorPosInfo = await getActorPositionInfo(tx, actorId);
      if (!actorPosInfo) {
        throw new AppError(
          "FORBIDDEN",
          "Actor must have an assigned position",
          403,
        );
      }

      const currentStatus = trip.status as BusinessTripStatus;
      let newStatus: BusinessTripStatus = currentStatus;

      const isRequester = trip.requesterId === actorId;
      const actorRole = await getActorRole(tx, actorId);

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
        // Use new trip workflow for initial status
        if (!trip.requesterPositionId) {
          throw new AppError(
            "BAD_REQUEST",
            "Trip requester position is missing",
            400,
          );
        }
        const nextApprover = await workflowService.getNextTripApprover(
          trip.requesterPositionId,
          "DRAFT",
          tx,
        );
        newStatus = nextApprover.nextStatus as BusinessTripStatus;
      }
      // Handle APPROVE / REJECT (Approval Flow)
      else {
        // if (isRequester) {
        //   throw new AppError(
        //     "FORBIDDEN",
        //     "Requester cannot approve or reject their own trip",
        //     403,
        //   );
        // }
        // Use workflow service to check if actor can transition
        const canTransition = await workflowService.canActorTransition(
          actorId,
          trip.currentApproverPositionId,
          trip.requiredApproverRole as PositionRole | null,
          currentStatus as
            | "DRAFT"
            | "PENDING_MANAGER"
            | "PENDING_HOD"
            | "PENDING_HR"
            | "PENDING_FINANCE"
            | "PENDING_CEO",
          input.action,
          tx,
        );

        if (!canTransition) {
          throw new AppError(
            "FORBIDDEN",
            "Not authorized to perform this action",
            403,
          );
        }

        if (input.action === "REJECT") {
          // Rejection reason is required - check if comment is provided
          const trimmedComment = input.comment?.trim() ?? "";
          if (trimmedComment.length === 0) {
            throw new AppError(
              "BAD_REQUEST",
              "Rejection reason is required",
              400,
            );
          }
          // Enforce maximum comment length to prevent database bloat
          const MAX_COMMENT_LENGTH = 2000;
          if (trimmedComment.length > MAX_COMMENT_LENGTH) {
            throw new AppError(
              "BAD_REQUEST",
              `Rejection reason exceeds maximum length of ${MAX_COMMENT_LENGTH} characters`,
              400,
            );
          }
          newStatus = "REJECTED";
        } else if (input.action === "APPROVE") {
          // Use new trip workflow to determine next status
          if (!trip.requesterPositionId) {
            throw new AppError(
              "BAD_REQUEST",
              "Trip requester position is missing",
              400,
            );
          }
          const nextApprover = await workflowService.getNextTripApprover(
            trip.requesterPositionId,
            currentStatus as
              | "DRAFT"
              | "PENDING_MANAGER"
              | "PENDING_HOD"
              | "PENDING_HR"
              | "PENDING_FINANCE"
              | "PENDING_CEO",
            tx,
          );
          newStatus = nextApprover.nextStatus as BusinessTripStatus;
        }
      }

      // Set current approver (who can act at newStatus), not the next step's approver
      let nextApproverPositionId: string | null = null;
      let nextApproverRole: PositionRole | null = null;

      if (
        newStatus !== "REJECTED" &&
        newStatus !== "CANCELLED" &&
        trip.requesterPositionId
      ) {
        const currentApprover = await workflowService.getTripApproverForStatus(
          trip.requesterPositionId,
          newStatus,
          tx,
        );
        nextApproverPositionId = currentApprover.approverPositionId;
        nextApproverRole = currentApprover.approverRole;
      }

      // Update with optimistic locking
      const [updated] = await tx
        .update(businessTrip)
        .set({
          status: newStatus,
          currentApproverPositionId: nextApproverPositionId,
          requiredApproverRole: nextApproverRole,
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

      // Get next approver user ID for notifications
      let nextApproverUserId: string | null = null;
      if (nextApproverPositionId) {
        const [assignment] = await tx
          .select({ userId: userPositionAssignment.userId })
          .from(userPositionAssignment)
          .where(eq(userPositionAssignment.positionId, nextApproverPositionId))
          .limit(1);
        nextApproverUserId = assignment?.userId ?? null;
      }

      // Return data needed for notifications (outside transaction)
      return {
        updated,
        trip,
        newStatus,
        nextApproverUserId,
      };
    });

    // Send notifications outside transaction to avoid rollback on notification failure
    const { trip, newStatus, nextApproverUserId } = result;

    try {
      await notifyUser({
        userId: trip.requesterId,
        message: `Business trip to ${trip.city}, ${trip.country} updated to ${newStatus}`,
      });

      if (nextApproverUserId && nextApproverUserId !== trip.requesterId) {
        await notifyUser({
          userId: nextApproverUserId,
          message: `New Business Trip Approval Required: ${trip.city}, ${trip.country}`,
        });
      }
    } catch (notifyError) {
      // Log notification errors but don't fail the transaction
      console.warn(
        "[business-trips] Failed to send notifications:",
        notifyError,
      );
    }

    return result.updated;
  },

  /**
   * Get all related requests and trips visible to the actor using dynamic CTE
   * Shows visibility for all requested and involved workflows based on position hierarchy
   */
  async getAllRelated(
    actorId: string,
    params: z.infer<typeof getMyTripsSchema>,
  ) {
    const { page, pageSize, search, status, sortBy, sortOrder } = params;
    const actorPosInfo = await getActorPositionInfo(db, actorId);
    if (!actorPosInfo?.positionId) {
      return { data: [], total: 0, page, pageSize, pageCount: 0 };
    }

    const descendantsResult = await db.execute(sql`
        WITH RECURSIVE descendants AS (
          SELECT id AS position_id FROM job_position WHERE id = ${actorPosInfo.positionId}
          UNION ALL
          SELECT jp.id FROM job_position jp INNER JOIN descendants d ON jp.reports_to_position_id = d.position_id
        )
        SELECT position_id FROM descendants
      `);
    const descendantIds = descendantsResult.rows.map(
      (r) => r.position_id as string,
    );

    const conditions: SQL[] = [
      or(
        eq(businessTrip.requesterId, actorId),
        inArray(businessTrip.requesterPositionId, descendantIds),
        inArray(businessTrip.currentApproverPositionId, descendantIds),
        eq(
          businessTrip.requiredApproverRole,
          actorPosInfo.positionRole as PositionRole,
        ),
      ) as SQL,
    ];

    if (status?.length) {
      conditions.push(inArray(businessTrip.status, status));
    }
    if (search) {
      conditions.push(ilike(businessTrip.country, `%${search}%`));
    }

    const offset = (page - 1) * pageSize;
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

    return {
      data,
      total: totalResult[0]?.count ?? 0,
      page,
      pageSize,
      pageCount: Math.ceil((totalResult[0]?.count ?? 0) / pageSize),
    };
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

  async getApprovalHistory(tripId: string) {
    return await db
      .select({
        id: approvalLog.id,
        requestId: approvalLog.requestId,
        actorId: approvalLog.actorId,
        action: approvalLog.action,
        stepName: approvalLog.stepName,
        comment: approvalLog.comment,
        performedAt: approvalLog.performedAt,
        actor: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(approvalLog)
      .leftJoin(user, eq(approvalLog.actorId, user.id))
      .where(eq(approvalLog.requestId, tripId))
      .orderBy(approvalLog.performedAt);
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

/** Return type of getPendingApprovals; use for type-safe consumption on the frontend. */
export type PendingTripApprovalsResult = Awaited<
  ReturnType<BusinessTripsService["getPendingApprovals"]>
>;
