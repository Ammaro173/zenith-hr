import type { BetterAuthClientPlugin } from "better-auth/client";
import { inferAdditionalFields } from "better-auth/client/plugins";

/**
 * Shared auth plugins configuration used by both client and server auth clients.
 * Single source of truth for user field extensions.
 */
export const authPlugins = [
  inferAdditionalFields({
    user: {
      sapNo: { type: "string" },
      role: { type: "string", required: false },
      status: { type: "string", required: false },
      departmentId: { type: "string", required: false },
    },
  }),
] satisfies BetterAuthClientPlugin[];
