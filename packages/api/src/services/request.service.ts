import type { db as _db } from "@zenith-hr/db";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { requestVersion } from "@zenith-hr/db/schema/request-versions";
import { desc, eq } from "drizzle-orm";

/**
 * RequestService handles request-related business logic
 */
export class RequestService {
  /**
   * Generate a unique request code
   */
  static generateRequestCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `REQ-${timestamp}-${random}`;
  }

  /**
   * Get request versions history
   */
  static async getRequestVersions(db: typeof _db, requestId: string) {
    return await db
      .select()
      .from(requestVersion)
      .where(eq(requestVersion.requestId, requestId))
      .orderBy(desc(requestVersion.versionNumber));
  }

  /**
   * Validate budget details
   */
  static validateBudgetDetails(budgetDetails: Record<string, unknown>): void {
    const required = ["minSalary", "maxSalary", "currency"];
    for (const field of required) {
      if (!(field in budgetDetails)) {
        throw new Error(`Missing required budget field: ${field}`);
      }
    }

    const { minSalary, maxSalary } = budgetDetails as {
      minSalary: number;
      maxSalary: number;
    };
    if (minSalary > maxSalary) {
      throw new Error("Minimum salary cannot exceed maximum salary");
    }
  }

  /**
   * Check if user can edit request
   */
  static async canUserEditRequest(
    db: typeof _db,
    requestId: string,
    userId: string
  ): Promise<boolean> {
    const [request] = await db
      .select()
      .from(manpowerRequest)
      .where(eq(manpowerRequest.id, requestId))
      .limit(1);

    if (!request) {
      return false;
    }

    // Only requester can edit, and only if in DRAFT status
    return request.requesterId === userId && request.status === "DRAFT";
  }
}
