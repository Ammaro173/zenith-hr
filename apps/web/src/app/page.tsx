import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  getDefaultRouteForRole,
  getRoleFromSessionUser,
} from "@/config/navigation";
import { getServerSession } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession();

  if (session?.error || !session?.data?.user) {
    redirect("/login");
  }

  const role = getRoleFromSessionUser(session.data.user);
  redirect(getDefaultRouteForRole(role) as Route);
}
