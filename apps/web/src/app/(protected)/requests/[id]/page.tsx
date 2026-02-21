import { getServerSession } from "@/lib/server-session";
import { RequestDetailClientPage } from "./client-page";

export default async function RequestDetailPage() {
  const session = await getServerSession();
  const currentUserId = session?.data?.user?.id;
  const currentUserRole = (session?.data?.user as { role?: string })?.role;

  return (
    <RequestDetailClientPage
      currentUserId={currentUserId}
      currentUserRole={currentUserRole}
    />
  );
}
