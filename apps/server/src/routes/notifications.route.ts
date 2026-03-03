import { on } from "node:events";
import { notificationEmitter } from "@zenith-hr/api";
import { auth } from "@zenith-hr/auth";
import type { Context } from "elysia";

export async function* notificationsStreamHandler(context: Context) {
  context.set.headers["Content-Type"] = "text/event-stream";
  context.set.headers["Cache-Control"] = "no-cache";
  context.set.headers.Connection = "keep-alive";

  const session = await auth.api.getSession({
    headers: context.request.headers,
  });

  if (!session?.user) {
    context.set.status = 401;
    return;
  }

  const userId = session.user.id;
  yield `data: ${JSON.stringify({ type: "connected" })}\n\n`;

  const ac = new AbortController();
  context.request.signal.addEventListener("abort", () => {
    ac.abort();
  });

  try {
    for await (const [data] of on(
      notificationEmitter,
      `notification:${userId}`,
      { signal: ac.signal },
    )) {
      yield `data: ${JSON.stringify(data)}\n\n`;
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return;
    }
    // Silent fail for stream closures
  }
}
