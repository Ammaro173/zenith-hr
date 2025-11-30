import { auth } from "@zenith-hr/auth";
import { db } from "@zenith-hr/db";
import type { Context as ElysiaContext } from "elysia";
import pino from "pino";
import { MemoryCache } from "./infrastructure/cache";
import type {
  CacheService,
  PdfService as IPdfService,
  StorageService as IStorageService,
} from "./infrastructure/interfaces";
import { PdfService } from "./infrastructure/pdf/pdf.service";
import { S3StorageService } from "./infrastructure/storage/s3.service";
import { createCandidatesService } from "./modules/candidates";
import { createContractsService } from "./modules/contracts";
import { createDashboardService } from "./modules/dashboard";
import { createRequestsService } from "./modules/requests";
import { createWorkflowService } from "./modules/workflow";

// Initialize infrastructure (Singletons)
// Using interface types allows for easy swapping of implementations
const storage: IStorageService = new S3StorageService();
const pdf: IPdfService = new PdfService();
const cache: CacheService = new MemoryCache();

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

  // Initialize services with dependencies
  const services = {
    requests: createRequestsService(db),
    contracts: createContractsService(db, storage, pdf),
    dashboard: createDashboardService(db),
    candidates: createCandidatesService(db, storage),
    workflow: createWorkflowService(db),
  };

  return {
    session,
    request: context.request,
    db,
    storage,
    pdf,
    cache,
    services, // Expose services
    logger: logger.child({ requestId }),
    requestId,
  };
}
