import { separationChecklist, separationRequest } from "@zenith-hr/db";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type {
  createSeparationSchema,
  updateChecklistSchema,
  updateSeparationSchema,
} from "./separations.schema";

export const createSeparationsService = (
  db: typeof import("@zenith-hr/db").db
) => {
  return {
    async create(
      input: z.infer<typeof createSeparationSchema>,
      employeeId: string
    ) {
      return await db.transaction(async (tx) => {
        const [request] = await tx
          .insert(separationRequest)
          .values({
            employeeId,
            type: input.type,
            reason: input.reason,
            lastWorkingDay: input.lastWorkingDay,
            status: "DRAFT",
          })
          .returning();

        if (!request) {
          throw new Error("Failed to create separation request");
        }

        // Auto-create checklist items based on type (simplified logic)
        const departments = ["IT", "HR", "FINANCE", "ADMIN"] as const;
        const checklistItems = departments.map((dept) => ({
          separationId: request.id,
          department: dept,
          item: `Clearance from ${dept}`,
          status: "PENDING" as const,
        }));

        await tx.insert(separationChecklist).values(checklistItems);

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
          lastWorkingDay: input.lastWorkingDay,
          updatedAt: new Date(),
        })
        .where(eq(separationRequest.id, input.separationId))
        .returning();
      return updated;
    },

    async updateChecklist(
      input: z.infer<typeof updateChecklistSchema>,
      userId: string
    ) {
      const [updated] = await db
        .update(separationChecklist)
        .set({
          status: input.status,
          completedBy: userId,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(separationChecklist.id, input.checklistId))
        .returning();
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
  };
};
