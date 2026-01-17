import { getRoleFromSessionUser } from "@/config/navigation";
import { getServerSession } from "@/lib/server-session";
import { BusinessTripDetailClientPage } from "./client-page";

export default async function BusinessTripDetailPage() {
  const session = await getServerSession();
  const role = getRoleFromSessionUser(session?.data?.user);

  return <BusinessTripDetailClientPage role={role} />;
}
