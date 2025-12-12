import { headers } from "next/headers";
import { authClient } from "@/lib/auth-client";

export async function getServerSession() {
  return await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: false,
    },
  });
}
