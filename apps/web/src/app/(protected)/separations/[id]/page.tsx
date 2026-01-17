import { getRoleFromSessionUser } from "@/config/navigation";
import { getServerSession } from "@/lib/server-session";
import { SeparationDetailClientPage } from "./client-page";

export default async function SeparationDetailPage() {
  const session = await getServerSession();
  const role = getRoleFromSessionUser(session?.data?.user);

  return <SeparationDetailClientPage role={role} />;
}
