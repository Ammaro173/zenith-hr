import { auth } from "@zenith-hr/auth";
import { db } from "@zenith-hr/db";
import type { Context as ElysiaContext } from "elysia";
import pino from "pino";
import { PdfService } from "./services/pdf-service";
import { S3StorageService } from "./services/storage";

// Initialize services (Singletons)
const storage = new S3StorageService();
const pdf = new PdfService();

// Initialize logger
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        }
      : undefined,
});

export type CreateContextOptions = {
  context: ElysiaContext;
};

export type Context = Awaited<ReturnType<typeof createContext>>;

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.request.headers,
  });

  const requestId = crypto.randomUUID();

  return {
    session,
    request: context.request,
    db,
    storage,
    pdf,
    logger: logger.child({ requestId }),
    requestId,
  };
}
