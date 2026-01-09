import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { appRouter, createContext } from "@zenith-hr/api/server";
import type { Context } from "elysia";

/**
 * Create OpenAPI handler with schema converter
 * Not exported to avoid TypeScript portable type issues with transitive dependencies
 */
const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error("[OpenAPI Error]", error);
    }),
  ],
});

/**
 * OpenAPI route handler
 */
export async function openApiRouteHandler(context: Context) {
  const { response } = await apiHandler.handle(context.request, {
    prefix: "/api-reference",
    context: await createContext({ context }),
  });

  return response ?? new Response("Not Found", { status: 404 });
}
