# Zenith HR

> Enterprise HR platform for manpower request management, candidate tracking, and contract workflows.

A TypeScript monorepo built with Turborepo + Bun workspaces, featuring type-safe APIs with oRPC and OpenAPI integration.

## Table of Contents

- [Project Overview](#project-overview)
- [Technology Stack](#technology-stack)
- [Monorepo Structure](#monorepo-structure)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Architecture](#api-architecture)
- [Authentication](#authentication)
- [Infrastructure Abstractions](#infrastructure-abstractions)
- [Testing & Linting](#testing--linting)
- [Deployment](#deployment)

---

## Project Overview

Zenith HR is an enterprise-grade Human Resources platform designed to streamline:

- **Manpower Request Management** - Create, track, and manage staffing requests through a multi-level approval workflow
- **Candidate Tracking** - Upload CVs, track candidates, and manage the hiring pipeline
- **Contract Workflows** - Generate contracts, manage signatures, and track contract status
- **Approval Chain** - Multi-tier approval process (Manager → HR → Finance → CEO)

### Target Users

- **HR Staff** - Manage requests, candidates, and contracts
- **Managers** - Submit and approve team requests
- **Finance** - Budget approval for positions
- **CEO** - Final approval authority

---

## Technology Stack

| Layer                | Technology                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------- |
| **Runtime**          | [Bun](https://bun.sh) (v1.3+)                                                               |
| **Backend**          | [Elysia](https://elysiajs.com) server + [oRPC](https://orpc.dev) (type-safe RPC)            |
| **Frontend**         | [Next.js 16](https://nextjs.org) with App Router                                            |
| **Database**         | [Drizzle ORM](https://orm.drizzle.team) + [Neon](https://neon.tech) (serverless PostgreSQL) |
| **Authentication**   | [better-auth](https://www.better-auth.com)                                                  |
| **Linting**          | [Biome](https://biomejs.dev)                                                                |
| **Build System**     | [Turborepo](https://turbo.build)                                                            |
| **UI Components**    | [shadcn/ui](https://ui.shadcn.com) + [Radix UI](https://www.radix-ui.com)                   |
| **State Management** | [TanStack Query](https://tanstack.com/query) + [Zustand](https://zustand.docs.pmnd.rs)      |
| **PDF Generation**   | [@react-pdf/renderer](https://react-pdf.org) + [pdf-lib](https://pdf-lib.js.org)            |
| **File Storage**     | AWS S3                                                                                      |
| **AI Integration**   | [Vercel AI SDK](https://sdk.vercel.ai) + Google Generative AI                               |

---

## Monorepo Structure

```
zenith-hr/
├── apps/
│   ├── server/           # Elysia API server
│   │   ├── src/
│   │   │   ├── index.ts        # Server entry point
│   │   │   ├── env.ts          # Environment configuration
│   │   │   ├── plugins/        # Elysia plugins (CORS, etc.)
│   │   │   └── routes/         # Route handlers (auth, rpc, webhooks)
│   │   └── package.json
│   │
│   └── web/              # Next.js frontend
│       ├── src/
│       │   ├── app/            # App Router pages
│       │   ├── components/     # UI components
│       │   └── index.css       # Global styles
│       └── package.json
│
├── packages/
│   ├── api/              # oRPC routers, services, infrastructure
│   │   ├── src/
│   │   │   ├── modules/        # Feature modules (requests, candidates, etc.)
│   │   │   ├── infrastructure/ # Storage, PDF, cache services
│   │   │   ├── shared/         # Middleware, types
│   │   │   ├── context.ts      # Request context factory
│   │   │   └── router.ts       # Main app router
│   │   └── package.json
│   │
│   ├── db/               # Drizzle ORM schema & migrations
│   │   ├── src/
│   │   │   ├── schema/         # Table definitions
│   │   │   ├── migrations/     # SQL migrations
│   │   │   └── index.ts        # Database client
│   │   └── package.json
│   │
│   ├── auth/             # better-auth configuration
│   │   ├── src/
│   │   │   └── index.ts        # Auth instance
│   │   └── package.json
│   │
│   └── config/           # Shared TypeScript configs, env schemas
│       ├── tsconfig.base.json
│       ├── env.ts              # Zod environment schemas
│       └── package.json
│
├── biome.json            # Linting configuration
├── turbo.json            # Turborepo task configuration
└── package.json          # Root workspace configuration
```

---

## Prerequisites

- **Bun** >= 1.3.x ([Install Bun](https://bun.sh/docs/installation))
- **Node.js** >= 20.x (for Next.js compatibility)
- **PostgreSQL** database or [Neon](https://neon.tech) account
- **AWS Account** (for S3 file storage) - optional for local development

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/zenith-hr.git
cd zenith-hr
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Configure Environment Variables

Copy the example environment file from the monorepo root:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration (see [Environment Variables](#environment-variables) section).

### 4. Setup Database

Ensure you have a PostgreSQL database available. For serverless PostgreSQL, we recommend [Neon](https://neon.tech).

Push the schema to your database:

```bash
bun run db:push
```

### 5. Start Development Servers

```bash
bun run dev
```

This starts:

- **API Server**: http://localhost:3000
- **Web Application**: http://localhost:3001

---

## Environment Variables

All environment variables are configured in a single `.env` file at the monorepo root. This file is loaded automatically by all apps and packages.

### Root Environment (`/.env`)

```bash
# Database (Required)
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Authentication (Required for production)
BETTER_AUTH_SECRET=your-32-character-secret-key-here
BETTER_AUTH_URL=http://localhost:3000

# CORS
CORS_ORIGIN=http://localhost:3001

# AWS S3 (Optional - for file uploads)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=your-bucket-name

# AI (Optional - for AI features)
GOOGLE_GENERATIVE_AI_API_KEY=your-google-ai-key

# Server (Optional)
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Cache (Optional - for Redis caching)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Web App - Client-side (exposed to browser)
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
NEXT_PUBLIC_WEB_URL=http://localhost:3001
```

### Environment Schema Validation

Environment variables are validated using Zod schemas defined in `packages/config/env.ts`. Each package imports only the schemas it needs, ensuring type safety and early error detection.

---

## Available Scripts

### Development

| Command              | Description                       |
| -------------------- | --------------------------------- |
| `bun run dev`        | Start all dev servers (web + API) |
| `bun run dev:web`    | Start only the web application    |
| `bun run dev:server` | Start only the API server         |

### Build & Deploy

| Command               | Description                                  |
| --------------------- | -------------------------------------------- |
| `bun run build`       | Build all packages and applications          |
| `bun run start`       | Start production servers                     |
| `bun run check-types` | TypeScript type checking across all packages |

### Database

| Command               | Description                                     |
| --------------------- | ----------------------------------------------- |
| `bun run db:generate` | Generate Drizzle migrations from schema changes |
| `bun run db:push`     | Push schema directly to database (dev)          |
| `bun run db:migrate`  | Run pending migrations (production)             |
| `bun run db:studio`   | Open Drizzle Studio GUI                         |

### Code Quality

| Command         | Description                     |
| --------------- | ------------------------------- |
| `bun run check` | Run Biome linting with auto-fix |

---

## API Architecture

The API follows a layered architecture pattern:

```
Router → Service → Drizzle ORM → PostgreSQL
```

### Flow

1. **Router** - Handles HTTP requests, input validation, and error mapping
2. **Service** - Contains business logic and data access
3. **Drizzle ORM** - Type-safe database queries
4. **PostgreSQL** - Data persistence

### Example: Router Pattern

```typescript
// packages/api/src/modules/candidates/candidates.router.ts
import { ORPCError } from '@orpc/server';
import { protectedProcedure } from '../../shared/middleware';
import { uploadCvSchema } from './candidates.schema';

export const candidatesRouter = {
  uploadCV: protectedProcedure
    .input(uploadCvSchema)
    .handler(async ({ input, context }) => {
      // Auth already verified by protectedProcedure middleware
      return await context.services.candidates.uploadCv(input);
    }),
};
```

### Example: Service Pattern

```typescript
// packages/api/src/modules/candidates/candidates.service.ts
import type { db as _db } from "@zenith-hr/db";
import type { StorageService } from "../../infrastructure/interfaces";

export const createCandidatesService = (
  db: typeof _db,
  storage: StorageService
) => ({
  async uploadCv(input: UploadCvInput) {
    // 1. Validate business rules
    const [request] = await db
      .select()
      .from(manpowerRequest)
      .where(eq(manpowerRequest.id, input.requestId))
      .limit(1);

    if (!request) throw new Error("NOT_FOUND");

    // 2. Upload file to storage
    const cvKey = `cvs/${input.requestId}/${Date.now()}.pdf`;
    await storage.upload(cvKey, input.cvFile);

    // 3. Save to database
    const [candidate] = await db
      .insert(candidates)
      .values({ ... })
      .returning();

    return candidate;
  },
});
```

---

## Authentication

Authentication is handled by the `better-auth` library with a middleware-based approach.

### Protected Procedures

The [`protectedProcedure`](packages/api/src/shared/middleware.ts:19) middleware automatically verifies authentication:

```typescript
// packages/api/src/shared/middleware.ts
const requireAuth = o.middleware(({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError('UNAUTHORIZED');
  }
  return next({
    context: { session: context.session },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);
```

### Usage in Handlers

When using `protectedProcedure`, authentication is **already verified**. No additional checks needed:

```typescript
// ✅ Correct - middleware handles auth
protectedProcedure.handler(async ({ context }) => {
  const userId = context.session.user.id; // Always available
  return await context.services.requests.getByRequester(userId);
});

// ❌ Wrong - redundant check
protectedProcedure.handler(async ({ context }) => {
  if (!context.session?.user) {
    // Don't do this!
    throw new ORPCError('UNAUTHORIZED');
  }
});
```

---

## Infrastructure Abstractions

The API uses interface-based abstractions for infrastructure services, enabling easy testing and implementation swapping.

### Storage Service

```typescript
// packages/api/src/infrastructure/interfaces/storage.interface.ts
export type StorageService = {
  upload: (
    key: string,
    data: Buffer,
    options?: UploadOptions
  ) => Promise<string>;
  getPresignedUrl: (key: string, expiresIn?: number) => Promise<string>;
  delete?: (key: string) => Promise<void>;
};
```

### PDF Service

```typescript
// packages/api/src/infrastructure/interfaces/pdf.interface.ts
export type PdfService = {
  generateContractPdf: (params: GenerateContractParams) => Promise<Buffer>;
};
```

### Cache Service

```typescript
// packages/api/src/infrastructure/interfaces/cache.interface.ts
export type CacheService = {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T, ttlSeconds: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
  deletePattern: (pattern: string) => Promise<void>;
};
```

### Initialization

Services are initialized in [`context.ts`](packages/api/src/context.ts:21-23) using interface types:

```typescript
const storage: IStorageService = new S3StorageService();
const pdf: IPdfService = new PdfService();
const cache: CacheService = new MemoryCache();
```

---

## Testing & Linting

### Biome Configuration

The project uses [Biome](https://biomejs.dev) for linting and formatting, configured in [`biome.json`](biome.json:1).

```bash
# Run linting with auto-fix
bun run check
```

### TypeScript Configuration

- Strict mode enabled across all packages
- Shared base configuration in [`packages/config/tsconfig.base.json`](packages/config/tsconfig.base.json)
- Type safety enforced with `bun run check-types`

### Import Ordering

Biome enforces consistent import ordering:

1. External packages (alphabetical)
2. Internal packages (`@zenith-hr/*`)
3. Relative imports

---

## Deployment

### Server Deployment

The Elysia server can be deployed to any Node.js/Bun hosting:

- **[Railway](https://railway.app)** - Bun-native hosting
- **[Fly.io](https://fly.io)** - Edge deployment
- **[Render](https://render.com)** - Simple container hosting
- **AWS/GCP/Azure** - Container or serverless

Build the server:

```bash
cd apps/server
bun run build
```

Or compile to a standalone binary:

```bash
cd apps/server
bun run compile
```

### Web Deployment

The Next.js frontend is optimized for [Vercel](https://vercel.com):

```bash
# Deploy to Vercel
vercel
```

Or build for self-hosting:

```bash
cd apps/web
bun run build
bun run start
```

### Database

[Neon](https://neon.tech) serverless PostgreSQL is recommended for:

- Automatic scaling
- Built-in connection pooling
- Branching for development
- Generous free tier

---

## License

Private - All Rights Reserved

---

## Contributing

See [AGENTS.md](./AGENTS.md) for AI coding assistant guidelines and development conventions.
