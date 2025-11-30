import { google } from "@ai-sdk/google";
import { type CoreMessage, streamText } from "ai";
import type { Context } from "elysia";
import { z } from "zod";

/**
 * AI request body schema for validation (Point 9 improvement)
 */
const aiRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    })
  ),
  model: z.string().optional().default("gemini-2.5-flash"),
});

export type AiRequestBody = z.infer<typeof aiRequestSchema>;

/**
 * AI chat completion route handler
 */
export async function aiRouteHandler(context: Context) {
  try {
    const body = await context.request.json();

    // Validate request body
    const parseResult = aiRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          details: parseResult.error.flatten(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { messages, model } = parseResult.data;

    // Convert validated messages to CoreMessage format
    const coreMessages: CoreMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const result = streamText({
      model: google(model),
      messages: coreMessages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("[AI Error]", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process AI request",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
