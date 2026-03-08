import { getServerSession } from "@/lib/server-session";
import { EditBusinessTripClientPage } from "./client-page";

export default async function EditBusinessTripPage() {
  const session = await getServerSession();
  const currentUserId = session?.data?.user?.id;

  return <EditBusinessTripClientPage currentUserId={currentUserId} />;
}
