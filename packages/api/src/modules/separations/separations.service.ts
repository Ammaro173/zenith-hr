import {
  auditLog,
  separationChecklist,
  separationRequest,
} from "@zenith-hr/db";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { AppError } from "../../shared/errors";
import { notifyUser } from "../../shared/notify";
import { getActorRole } from "../../shared/utils";
import type {
  createSeparationSchema,
  startClearanceSchema,
  updateChecklistSchema,
  updateSeparationSchema,
} from "./separations.schema";

export const createSeparationsService = (
  db: typeof import("@zenith-hr/db").db,
) => {
  const departmentItems: Record<"IT" | "ADMIN" | "FINANCE" | "HR", string[]> = {
    IT: [
      "Computer/Laptop",
      "Printer",
      "SAP Account Disable",
      "Email Account Disable",
    ],
    ADMIN: [
      "Access Card",
      "Office Keys",
      "Company Car",
      "Mobile Phone",
      "SIM Card",
    ],
    FINANCE: ["Outstanding Loans", "Credit Cards"],
    HR: ["Medical Insurance Cards", "ID Badge"],
  };

  const roleToDepartment: Record<string, keyof typeof departmentItems> = {
    IT: "IT",
    ADMIN: "ADMIN",
    FINANCE: "FINANCE",
    HR: "HR",
  };

  return {
    async create(
      input: z.infer<typeof createSeparationSchema>,
      employeeId: string,
    ) {
      return await db.transaction(async (tx) => {
        const [request] = await tx
          .insert(separationRequest)
          .values({
            employeeId,
            type: input.type,
            reason: input.reason,
            lastWorkingDay: input.lastWorkingDay.toISOString().slice(0, 10),
            noticePeriodWaived: input.noticePeriodWaived,
            status: "REQUESTED",
          })
          .returning();

        if (!request) {
          throw new Error("Failed to create separation request");
        }

        return request;
      });
    },

    async get(separationId: string) {
      return await db.query.separationRequest.findFirst({
        where: eq(separationRequest.id, separationId),
        with: {
          checklistItems: true,
          employee: true,
        },
      });
    },

    async update(input: z.infer<typeof updateSeparationSchema>) {
      const [updated] = await db
        .update(separationRequest)
        .set({
          status: input.status,
          reason: input.reason,
          lastWorkingDay: input.lastWorkingDay
            ? input.lastWorkingDay.toISOString().slice(0, 10)
            : undefined,
          updatedAt: new Date(),
        })
        .where(eq(separationRequest.id, input.separationId))
        .returning();
      return updated;
    },

    async updateChecklist(
      input: z.infer<typeof updateChecklistSchema>,
      userId: string,
    ) {
      const actorRole = await getActorRole(db, userId);

      const [checklist] = await db
        .select()
        .from(separationChecklist)
        .where(eq(separationChecklist.id, input.checklistId))
        .limit(1);

      if (!checklist) {
        throw AppError.notFound("Checklist item not found");
      }

      const allowedDepartment = actorRole
        ? roleToDepartment[actorRole]
        : undefined;

      if (!allowedDepartment || allowedDepartment !== checklist.department) {
        throw new AppError(
          "FORBIDDEN",
          "Not authorized for this department",
          403,
        );
      }

      const [updated] = await db
        .update(separationChecklist)
        .set({
          status: input.status,
          completedBy: userId,
          completedAt: new Date(),
          remarks: input.remarks,
          updatedAt: new Date(),
        })
        .where(eq(separationChecklist.id, input.checklistId))
        .returning();

      await db.insert(auditLog).values({
        entityId: checklist.separationId,
        entityType: "SEPARATION",
        action: `CHECKLIST_${input.status}`,
        performedBy: userId,
        performedAt: new Date(),
        metadata: {
          checklistId: input.checklistId,
          department: checklist.department,
          remarks: input.remarks,
        },
      });

      await notifyUser({
        userId,
        message: `Checklist item ${checklist.item} updated to ${input.status}`,
      });
      return updated;
    },

    async getAll() {
      return await db.query.separationRequest.findMany({
        with: {
          employee: true,
        },
        orderBy: (requests, { desc }) => [desc(requests.createdAt)],
      });
    },

    async startClearance(
      input: z.infer<typeof startClearanceSchema>,
      actorId: string,
    ) {
      const actorRole = await getActorRole(db, actorId);

      if (actorRole !== "HR") {
        throw new AppError("FORBIDDEN", "Only HR can start clearance", 403);
      }

      return await db.transaction(async (tx) => {
        const [request] = await tx
          .select()
          .from(separationRequest)
          .where(eq(separationRequest.id, input.separationId))
          .limit(1);

        if (!request) {
          throw AppError.notFound("Separation request not found");
        }

        const checklistItems = (
          Object.keys(departmentItems) as (keyof typeof departmentItems)[]
        ).flatMap((dept) =>
          departmentItems[dept].map((itemName) => ({
            separationId: request.id,
            department: dept,
            item: itemName,
            status: "PENDING" as const,
          })),
        );

        await tx.insert(separationChecklist).values(checklistItems);

        const [updated] = await tx
          .update(separationRequest)
          .set({
            status: "CLEARANCE_IN_PROGRESS",
            updatedAt: new Date(),
          })
          .where(eq(separationRequest.id, input.separationId))
          .returning();

        await tx.insert(auditLog).values({
          entityId: input.separationId,
          entityType: "SEPARATION",
          action: "START_CLEARANCE",
          performedBy: actorId,
          performedAt: new Date(),
        });

        await notifyUser({
          userId: request.employeeId,
          message: "Clearance process started",
        });

        return updated;
      });
    },
  };
};
