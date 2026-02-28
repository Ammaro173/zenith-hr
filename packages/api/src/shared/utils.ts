import type { DbOrTx } from "@zenith-hr/db";
import { user } from "@zenith-hr/db/schema/auth";
import {
  jobPosition,
  userPositionAssignment,
} from "@zenith-hr/db/schema/position-slots";
import { eq } from "drizzle-orm";
import type { UserRole } from "./types";

export async function getActorRole(
  db: DbOrTx,
  userId: string,
): Promise<UserRole> {
  const [result] = await db
    .select({ role: jobPosition.role })
    .from(userPositionAssignment)
    .innerJoin(
      jobPosition,
      eq(userPositionAssignment.positionId, jobPosition.id),
    )
    .where(eq(userPositionAssignment.userId, userId))
    .limit(1);
  return (result?.role ?? "EMPLOYEE") as UserRole;
}

export async function getActorPositionInfo(db: DbOrTx, userId: string) {
  const [result] = await db
    .select({
      positionId: jobPosition.id,
      positionRole: jobPosition.role,
      departmentId: jobPosition.departmentId,
      reportsToPositionId: jobPosition.reportsToPositionId,
    })
    .from(userPositionAssignment)
    .innerJoin(
      jobPosition,
      eq(userPositionAssignment.positionId, jobPosition.id),
    )
    .where(eq(userPositionAssignment.userId, userId))
    .limit(1);
  return result ?? null;
}

export function isHODFamily(role: string): boolean {
  return ["HOD", "HOD_HR", "HOD_FINANCE", "HOD_IT"].includes(role);
}

export function isExecutiveRole(role: string): boolean {
  return ["HOD_HR", "HOD_FINANCE", "CEO"].includes(role);
}

export async function getActor(
  db: DbOrTx,
  userId: string,
): Promise<{ id: string; role: UserRole; name: string } | null> {
  const [result] = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!result) {
    return null;
  }
  const role = await getActorRole(db, userId);
  return { ...result, role };
}
