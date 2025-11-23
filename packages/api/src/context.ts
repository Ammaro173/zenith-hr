import { auth } from "@zenith-hr/auth";
import { db } from "@zenith-hr/db";
import type { Context as ElysiaContext } from "elysia";
import { PdfService } from "./services/pdf-service";
import { S3StorageService } from "./services/storage";

// Initialize services (Singletons)
const storage = new S3StorageService();
const pdf = new PdfService();

export type CreateContextOptions = {
  context: ElysiaContext;
};

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.request.headers,
  });
  return {
    session,
    request: context.request,
    db,
    storage,
    pdf,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
