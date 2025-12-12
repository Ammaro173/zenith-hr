import { redirect } from "next/navigation";
import type { UserRole } from "@/config/navigation";
import { getRoleFromSessionUser } from "@/config/navigation";
import { getServerSession } from "@/lib/server-session";

export async function requireAuth() {
  const session = await getServerSession();
  const user = session?.data?.user;
  if (session?.error || !user) {
    redirect("/login");
  }
  return { session, user };
}

export async function requireRoles(
  roles: UserRole[],
  redirectTo = "/dashboard"
) {
  const { session, user } = await requireAuth();
  const role = getRoleFromSessionUser(user);
  if (!(role && roles.includes(role))) {
    redirect(redirectTo as never);
  }
  return { session, user, role };
}
