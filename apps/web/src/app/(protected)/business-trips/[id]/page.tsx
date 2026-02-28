import { getRoleFromSessionUser } from "@/config/navigation";
import { getServerSession } from "@/lib/server-session";
import { BusinessTripDetailClientPage } from "./client-page";

export default async function BusinessTripDetailPage() {
  const session = await getServerSession();
  const user = session?.data?.user;
  const role = getRoleFromSessionUser(user);
  const currentUserId = user?.id;
  const currentUserRole = (user as { role?: string })?.role;

  return (
    <BusinessTripDetailClientPage
      currentUserId={currentUserId}
      currentUserRole={currentUserRole}
      role={role}
    />
  );
}
