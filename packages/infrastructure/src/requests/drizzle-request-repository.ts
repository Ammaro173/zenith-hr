import { db } from "@zenith-hr/db";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import type {
  IRequestRepository,
  ManpowerRequest,
} from "@zenith-hr/domain/requests";
import { desc, eq } from "drizzle-orm";

export class DrizzleRequestRepository implements IRequestRepository {
  async create(request: ManpowerRequest): Promise<ManpowerRequest> {
    const [created] = await db
      .insert(manpowerRequest)
      .values({
        id: request.id,
        requesterId: request.requesterId,
        requestCode: request.requestCode,
        status: request.status,
        positionDetails: request.positionDetails,
        budgetDetails: request.budgetDetails,
        revisionVersion: request.revisionVersion,
        version: request.version,
      })
      .returning();

    return created as ManpowerRequest;
  }

  async findById(id: string): Promise<ManpowerRequest | null> {
    const [found] = await db
      .select()
      .from(manpowerRequest)
      .where(eq(manpowerRequest.id, id))
      .limit(1);

    return (found as ManpowerRequest) || null;
  }

  async update(request: ManpowerRequest): Promise<ManpowerRequest> {
    const [updated] = await db
      .update(manpowerRequest)
      .set({
        status: request.status,
        positionDetails: request.positionDetails,
        budgetDetails: request.budgetDetails,
        version: request.version,
        updatedAt: new Date(),
      })
      .where(eq(manpowerRequest.id, request.id))
      .returning();

    return updated as ManpowerRequest;
  }

  async findByRequesterId(requesterId: string): Promise<ManpowerRequest[]> {
    const requests = await db
      .select()
      .from(manpowerRequest)
      .where(eq(manpowerRequest.requesterId, requesterId))
      .orderBy(desc(manpowerRequest.createdAt));

    return requests as ManpowerRequest[];
  }

  async findByStatus(status: string): Promise<ManpowerRequest[]> {
    const requests = await db
      .select()
      .from(manpowerRequest)
      .where(eq(manpowerRequest.status, status as never))
      .orderBy(desc(manpowerRequest.createdAt));

    return requests as ManpowerRequest[];
  }
}
