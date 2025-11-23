import { auth } from "@zenith-hr/auth";
import { db } from "@zenith-hr/db";
import { PdfService } from "@zenith-hr/infrastructure/services/pdf-service";
import { S3StorageService } from "@zenith-hr/infrastructure/services/s3-storage-service";
import type { Context as ElysiaContext } from "elysia";

export type CreateContextOptions = {
  context: ElysiaContext;
};

const storage = new S3StorageService();
const pdf = new PdfService();

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
