import { getRoleFromSessionUser } from "@/config/navigation";
import { getServerSession } from "@/lib/server-session";
import { PerformanceCycleClientPage } from "./client-page";

export default async function PerformanceCyclePage() {
  const session = await getServerSession();
  const role = getRoleFromSessionUser(session?.data?.user);

  return <PerformanceCycleClientPage role={role} />;
}
