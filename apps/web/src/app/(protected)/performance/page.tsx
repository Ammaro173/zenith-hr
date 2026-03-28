import { getRoleFromSessionUser } from "@/config/navigation";
import { getServerSession } from "@/lib/server-session";
import { PerformanceClientPage } from "./client-page";

const EMPLOYEE_TABS_ROLES = [
  "HOD_HR",
  "ADMIN",
  "HOD",
  "HOD_IT",
  "HOD_FINANCE",
] as const;

export default async function PerformancePage() {
  const session = await getServerSession();
  const role = getRoleFromSessionUser(session?.data?.user);

  const canViewEmployeeTabs =
    role != null && (EMPLOYEE_TABS_ROLES as readonly string[]).includes(role);

  return <PerformanceClientPage canViewEmployeeTabs={!!canViewEmployeeTabs} />;
}
