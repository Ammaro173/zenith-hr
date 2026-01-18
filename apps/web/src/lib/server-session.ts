import { createAuthClient } from "better-auth/react";
import { headers } from "next/headers";

import { authPlugins } from "./auth-plugins";
import { env } from "./env";

/**
 * Server-side auth client for SSR requests.
 * Uses SERVER_URL which points to the internal Docker network address.
 * This is necessary because 'localhost' inside a container refers to the container itself.
 */
const serverAuthClient = createAuthClient({
  baseURL: env.SERVER_URL,
  plugins: authPlugins,
});

export async function getServerSession() {
  return await serverAuthClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: false,
    },
  });
}
