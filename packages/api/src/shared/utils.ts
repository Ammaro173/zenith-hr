import { createHash } from "node:crypto";
import type { DbOrTx } from "@zenith-hr/db";
import { user } from "@zenith-hr/db/schema/auth";
import {
  jobPosition,
  userPositionAssignment,
} from "@zenith-hr/db/schema/position-slots";
import { eq } from "drizzle-orm";
import type { UserRole } from "./types";

// Users can have multiple active position assignments. When we need a single
// "effective" role (authorization, approval UI), we resolve it deterministically
// using the precedence below.
const ROLE_PRECEDENCE: Record<string, number> = {
  EMPLOYEE: 10,
  MANAGER: 20,
  HOD: 30,
  // Head-of-department variants are ordered to keep results deterministic
  // when a user holds multiple HOD slots at once.
  HOD_IT: 40,
  HOD_FINANCE: 40,
  HOD_HR: 50,
  CEO: 60,
  ADMIN: 70,
};

const MAX_ASSIGNMENTS_TO_CONSIDER = 50;

function pickHighestPrecedenceRole(
  roles: Array<{ role: string }>,
): string | null {
  if (roles.length === 0) {
    return null;
  }
  return roles.reduce((best, row) => {
    const bestScore = ROLE_PRECEDENCE[best.role] ?? 0;
    const rowScore = ROLE_PRECEDENCE[row.role] ?? 0;

    if (rowScore > bestScore) {
      return row;
    }
    if (rowScore < bestScore) {
      return best;
    }

    // Deterministic tie-breaker.
    return row.role > best.role ? row : best;
  }).role;
}

function pickHighestPrecedencePositionInfo<T extends { positionRole: string }>(
  rows: T[],
): T | null {
  if (rows.length === 0) {
    return null;
  }
  return rows.reduce((best, row) => {
    const bestScore = ROLE_PRECEDENCE[best.positionRole] ?? 0;
    const rowScore = ROLE_PRECEDENCE[row.positionRole] ?? 0;

    if (rowScore > bestScore) {
      return row;
    }
    if (rowScore < bestScore) {
      return best;
    }

    // Deterministic tie-breaker.
    return row.positionRole > best.positionRole ? row : best;
  });
}

export async function getActorRole(
  db: DbOrTx,
  userId: string,
): Promise<UserRole> {
  const assignments = await db
    .select({ role: jobPosition.role })
    .from(userPositionAssignment)
    .innerJoin(
      jobPosition,
      eq(userPositionAssignment.positionId, jobPosition.id),
    )
    .where(eq(userPositionAssignment.userId, userId))
    .limit(MAX_ASSIGNMENTS_TO_CONSIDER);

  const effective = pickHighestPrecedenceRole(assignments);
  return (effective ?? "EMPLOYEE") as UserRole;
}

export async function getActorPositionInfo(db: DbOrTx, userId: string) {
  const assignments = await db
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
    .limit(MAX_ASSIGNMENTS_TO_CONSIDER);

  const effective = pickHighestPrecedencePositionInfo(assignments);
  return effective ?? null;
}

export function isHODFamily(role: string): boolean {
  return ["HOD", "HOD_HR", "HOD_FINANCE", "HOD_IT"].includes(role);
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

export function generateIdempotencyKey(seed: string): string {
  return createHash("sha256").update(seed).digest("hex");
}
