import "dotenv/config";
import { google } from "@ai-sdk/google";
import { cors } from "@elysiajs/cors";
import { opentelemetry } from "@elysiajs/opentelemetry";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createContext } from "@zenith-hr/api/context";
import { appRouter } from "@zenith-hr/api/routers/index";
import { auth } from "@zenith-hr/auth";
import { convertToModelMessages, streamText } from "ai";
import { Elysia } from "elysia";

const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});
const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

export const app = new Elysia()
  .use(opentelemetry())
  .use(
    cors({
      origin: process.env.CORS_ORIGIN || "",
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  )
  .all("/api/auth/*", async (context) => {
    const { request, status } = context;
    if (["POST", "GET"].includes(request.method)) {
      return await auth.handler(request);
    }
    return status(405);
  })
  .all("/rpc*", async (context) => {
    const { response } = await rpcHandler.handle(context.request, {
      prefix: "/rpc",
      context: await createContext({ context }),
    });
    return response ?? new Response("Not Found", { status: 404 });
  })
  .all("/api*", async (context) => {
    const { response } = await apiHandler.handle(context.request, {
      prefix: "/api-reference",
      context: await createContext({ context }),
    });
    return response ?? new Response("Not Found", { status: 404 });
  })
  .post("/ai", async (context) => {
    const body = await context.request.json();
    //@ts-expect-error
    const uiMessages = body.messages || [];
    const result = streamText({
      model: google("gemini-2.5-flash"),
      messages: convertToModelMessages(uiMessages),
    });

    return result.toUIMessageStreamResponse();
  })
  .post("/api/webhooks/docusign", async (context) => {
    const { webhooksRouter } = await import("@zenith-hr/api/routers/webhooks");
    const body = (await context.request.json()) as {
      event: string;
      data: { envelopeId: string; status: string };
    };
    const result = await webhooksRouter.docusign.handler({
      input: body,
      context: await createContext({ context }),
    });
    return result;
  })
  .get("/", () => "OK")
  .listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
  });
