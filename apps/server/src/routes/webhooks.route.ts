import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { appRouter, createContext } from "@zenith-hr/api/server";
import type { Context } from "elysia";
import { z } from "zod";

/**
 * DocuSign webhook payload schema (Point 9 improvement)
 */
const docuSignWebhookSchema = z.object({
  event: z.string(),
  apiVersion: z.string().optional(),
  uri: z.string().optional(),
  retryCount: z.number().optional(),
  configurationId: z.string().optional(),
  generatedDateTime: z.string().optional(),
  data: z
    .object({
      accountId: z.string().optional(),
      envelopeId: z.string().optional(),
      envelopeSummary: z.unknown().optional(),
    })
    .optional(),
});

export type DocuSignWebhookPayload = z.infer<typeof docuSignWebhookSchema>;

/**
 * Create RPC handler for webhook processing
 * Local instance to avoid portable type issues with exports
 */
const webhookRpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error("[Webhook RPC Error]", error);
    }),
  ],
});

/**
 * Verify DocuSign webhook signature (placeholder for actual implementation)
 * In production, implement HMAC signature verification
 */
function verifyDocuSignSignature(
  _signature: string | null,
  _payload: string,
): boolean {
  // TODO: Implement actual signature verification
  // See: https://developers.docusign.com/platform/webhooks/connect/hmac/
  return true;
}

/**
 * DocuSign webhook route handler
 */
export async function docuSignWebhookHandler(context: Context) {
  try {
    // Get signature for verification
    const signature = context.request.headers.get("x-docusign-signature-1");
    const rawBody = await context.request.text();

    // Verify signature
    if (!verifyDocuSignSignature(signature, rawBody)) {
      console.warn("[Webhook] Invalid DocuSign signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse and validate body
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parseResult = docuSignWebhookSchema.safeParse(body);
    if (!parseResult.success) {
      console.warn("[Webhook] Invalid DocuSign payload:", parseResult.error);
      return new Response(
        JSON.stringify({
          error: "Invalid webhook payload",
          details: parseResult.error.flatten(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Forward to RPC handler for processing
    const { response } = await webhookRpcHandler.handle(context.request, {
      prefix: "/webhooks",
      context: await createContext({ context }),
    });

    return response ?? new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[Webhook Error]", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
