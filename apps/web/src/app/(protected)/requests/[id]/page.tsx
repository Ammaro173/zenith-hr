import { getServerSession } from "@/lib/server-session";
import { RequestDetailClientPage } from "./client-page";

export default async function RequestDetailPage() {
  const session = await getServerSession();
  const currentUserId = session?.data?.user?.id;

  return <RequestDetailClientPage currentUserId={currentUserId} />;
}
