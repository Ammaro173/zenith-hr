import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { appRouter, createContext } from "@zenith-hr/api/server";
import type { Context } from "elysia";

/**
 * Create RPC handler with error interceptor
 * Not exported to avoid TypeScript portable type issues with transitive dependencies
 */
const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error("[RPC Error]", error);
    }),
  ],
});

/**
 * RPC route handler
 */
export async function rpcRouteHandler(context: Context) {
  const { response } = await rpcHandler.handle(context.request, {
    prefix: "/rpc",
    context: await createContext({ context }),
  });

  return response ?? new Response("Not Found", { status: 404 });
}
