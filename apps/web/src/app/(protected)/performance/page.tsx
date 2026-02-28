import { getRoleFromSessionUser } from "@/config/navigation";
import { getServerSession } from "@/lib/server-session";
import { PerformanceClientPage } from "./client-page";

export default async function PerformancePage() {
  const session = await getServerSession();
  const role = getRoleFromSessionUser(session?.data?.user);

  const canCreateCycle = role === "HOD_HR" || role === "ADMIN";

  return <PerformanceClientPage canCreateCycle={canCreateCycle} />;
}
