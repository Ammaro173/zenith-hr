import { getServerSession } from "@/lib/server-session";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const sessionData = await getServerSession();
  const session = sessionData?.data;

  const role = session?.user?.role || "EMPLOYEE";

  return <DashboardClient role={role} />;
}
