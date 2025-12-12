import { auth } from "@zenith-hr/auth";
import { db, eq } from "@zenith-hr/db";
import { user } from "@zenith-hr/db/schema/auth";
import type { Context } from "elysia";

const MAX_FAILED_ATTEMPTS = 5;

const isEmailSignIn = (request: Request) =>
  request.method === "POST" && request.url.includes("/api/auth/sign-in/email");

/**
 * Auth route handler using better-auth
 */
export async function authHandler(context: Context) {
  const { request, set } = context;

  let email: string | undefined;

  if (isEmailSignIn(request)) {
    try {
      const body = (await request.clone().json()) as { email?: string };
      email = typeof body?.email === "string" ? body.email : undefined;
    } catch {
      // ignore parse errors and let auth handler manage
    }

    if (email) {
      const safeEmail = email;
      const dbUser = await db.query.user.findFirst({
        where: (fields, { eq }) => eq(fields.email, safeEmail),
      });

      if (
        dbUser?.failedLoginAttempts !== undefined &&
        (dbUser.failedLoginAttempts >= MAX_FAILED_ATTEMPTS ||
          dbUser.status === "INACTIVE")
      ) {
        set.status = 423;
        return new Response(
          JSON.stringify({ message: "Account locked. Contact admin." }),
          {
            status: 423,
            headers: { "content-type": "application/json" },
          }
        );
      }
    }
  }

  if (["POST", "GET"].includes(request.method)) {
    const response = await auth.handler(request);

    if (isEmailSignIn(request) && email) {
      const safeEmail = email;
      // Reset on success, increment on failure
      if (response.ok) {
        await db
          .update(user)
          .set({ failedLoginAttempts: 0, status: "ACTIVE" })
          .where(eq(user.email, safeEmail));
      } else {
        const [dbUser] = await db
          .select()
          .from(user)
          .where(eq(user.email, safeEmail))
          .limit(1);

        if (dbUser) {
          const attempts = (dbUser.failedLoginAttempts ?? 0) + 1;
          await db
            .update(user)
            .set({
              failedLoginAttempts: attempts,
              status:
                attempts >= MAX_FAILED_ATTEMPTS ? "INACTIVE" : dbUser.status,
            })
            .where(eq(user.email, safeEmail));

          if (attempts >= MAX_FAILED_ATTEMPTS) {
            return new Response(
              JSON.stringify({ message: "Account locked. Contact admin." }),
              {
                status: 423,
                headers: { "content-type": "application/json" },
              }
            );
          }
        }
      }
    }

    return response;
  }

  set.status = 405;
  return "Method Not Allowed";
}
