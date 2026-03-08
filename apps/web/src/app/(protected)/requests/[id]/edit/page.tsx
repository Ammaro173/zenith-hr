import { getServerSession } from "@/lib/server-session";
import { EditRequestClientPage } from "./client-page";

export default async function EditRequestPage() {
  const session = await getServerSession();
  const currentUserId = session?.data?.user?.id;

  return <EditRequestClientPage currentUserId={currentUserId} />;
}
