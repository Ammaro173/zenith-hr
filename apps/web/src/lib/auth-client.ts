import { createAuthClient } from "better-auth/react";

import { authPlugins } from "./auth-plugins";
import { env } from "./env";

/**
 * Client-side auth client for browser requests.
 * Uses NEXT_PUBLIC_SERVER_URL which points to the externally accessible server URL.
 */
export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_SERVER_URL,
  plugins: authPlugins,
});
