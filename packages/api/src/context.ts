import { auth } from "@zenith-hr/auth";
import { type DB, db } from "@zenith-hr/db";
import type { Context as ElysiaContext } from "elysia";
import pino from "pino";
import { env } from "./env";
import { MemoryCache } from "./infrastructure/cache";
import type {
  CacheService,
  PdfService as IPdfService,
  StorageService as IStorageService,
} from "./infrastructure/interfaces";
import { PdfService } from "./infrastructure/pdf/pdf.service";
import { S3StorageService } from "./infrastructure/storage/s3.service";
import { createBusinessTripsService } from "./modules/business-trips";
import { createCandidatesService } from "./modules/candidates";
import { createContractsService } from "./modules/contracts";
import { createDashboardService } from "./modules/dashboard";
import { createImportsService } from "./modules/imports";
import { createPerformanceService } from "./modules/performance";
import { createRequestsService } from "./modules/requests";
import { createSeparationsService } from "./modules/separations";
import { createUsersService } from "./modules/users";
import { createWebhooksService } from "./modules/webhooks";
import { createWorkflowService } from "./modules/workflow";

// Initialize infrastructure (Singletons)
// Using interface types allows for easy swapping of implementations
const storage: IStorageService = new S3StorageService();
const pdf: IPdfService = new PdfService();
const cache: CacheService = new MemoryCache();

// Initialize logger - no transport in production (bundled output)
const logger = pino({
  level: env.LOG_LEVEL,
});

export interface CreateContextOptions {
  context: ElysiaContext;
}

export type Context = Awaited<ReturnType<typeof createContext>>;

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.request.headers,
  });

  const requestId = crypto.randomUUID();

  // Initialize services with dependencies
  const workflow = createWorkflowService(db);

  const services = {
    workflow,
    requests: createRequestsService(db, workflow),
    contracts: createContractsService(db, storage, pdf),
    dashboard: createDashboardService(db),
    candidates: createCandidatesService(db, storage),
    businessTrips: createBusinessTripsService(db, workflow),
    performance: createPerformanceService(db),
    separations: createSeparationsService(db, storage),
    imports: createImportsService(db),
    users: createUsersService(db),
    webhooks: createWebhooksService(db),
  };

  return {
    session,
    request: context.request,
    db: db as DB,
    storage,
    pdf,
    cache,
    services, // Expose services
    logger: logger.child({ requestId }),
    requestId,
  };
}
