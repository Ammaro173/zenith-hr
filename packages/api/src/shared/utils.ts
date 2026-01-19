import { user } from "@zenith-hr/db/schema/auth";
import { eq } from "drizzle-orm";
import type { UserRole } from "./types";

/**
 * Get user's role by ID
 * Centralizes the repeated pattern of fetching actor role from database
 * Works with both db and transaction contexts
 */
export async function getActorRole(
  // biome-ignore lint/suspicious/noExplicitAny: Drizzle db/tx types are complex
  db: any,
  userId: string,
): Promise<UserRole> {
  const [result] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return (result?.role ?? "REQUESTER") as UserRole;
}

/**
 * Get user with basic info (role, id, name)
 * Works with both db and transaction contexts
 */
export async function getActor(
  // biome-ignore lint/suspicious/noExplicitAny: Drizzle db/tx types are complex
  db: any,
  userId: string,
): Promise<{ id: string; role: UserRole; name: string } | null> {
  const [result] = await db
    .select({ id: user.id, role: user.role, name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!result) {
    return null;
  }
  return { ...result, role: result.role as UserRole };
}
