import { auth } from "@zenith-hr/auth";
import type { Context } from "elysia";

/**
 * Auth route handler using better-auth
 */
export async function authHandler(context: Context) {
  const { request, set } = context;

  if (["POST", "GET"].includes(request.method)) {
    return await auth.handler(request);
  }

  set.status = 405;
  return "Method Not Allowed";
}
