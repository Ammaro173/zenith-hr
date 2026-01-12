# AGENTS.md - AI Coding Assistant Guide

> Guidelines for AI coding assistants working on the Zenith HR codebase.

This document provides context, conventions, and critical rules for AI assistants to follow when contributing to this project.

---

## Table of Contents

- [Project Context](#project-context)
- [Architectural Decisions](#architectural-decisions)
- [Critical Rules](#critical-rules)
- [File Organization](#file-organization)
- [Frontend Feature Organization](#frontend-feature-organization)
- [Naming Conventions](#naming-conventions)
- [Import Ordering](#import-ordering)
- [Error Handling](#error-handling)
- [Type Safety](#type-safety)
- [Database Patterns](#database-patterns)
- [Where to Add Things](#where-to-add-things)
- [Forbidden Patterns](#forbidden-patterns)
- [Testing](#testing)
- [Commit Messages](#commit-messages)
- [Quick Reference](#quick-reference)

---

## Project Context

### Domain Terminology

| Term                  | Description                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| **Manpower Request**  | A staffing request submitted by a manager for a new hire                |
| **Candidate**         | A potential hire with uploaded CV, linked to a request                  |
| **Contract**          | Employment agreement generated after candidate selection                |
| **Approval Workflow** | Multi-tier approval chain: Manager → HR → Finance → CEO                 |
| **Request Status**    | State machine: DRAFT → PENDING\_\* → APPROVED_OPEN → HIRING_IN_PROGRESS |

### Target Users

- **Requester** - Any employee submitting staffing requests
- **Manager** - First-level approval, team lead
- **HR** - Human Resources staff, manages candidates and contracts
- **Finance** - Budget approval authority
- **CEO** - Final approval for all requests

### Workflow States

```
DRAFT
  ↓ (submit)
PENDING_MANAGER
  ↓ (approve) / ↑ (request change)
PENDING_HR
  ↓ (approve) / ↑ (request change)
PENDING_FINANCE
  ↓ (approve) / ↑ (request change)
PENDING_CEO
  ↓ (approve) / ↗ (reject → REJECTED)
APPROVED_OPEN
  ↓ (select candidate)
HIRING_IN_PROGRESS
  ↓ (complete)
ARCHIVED
```

---

## Architectural Decisions

### Why oRPC over tRPC

We chose [oRPC](https://orpc.dev) instead of tRPC for several reasons:

1. **OpenAPI-first design** - Automatic OpenAPI spec generation from routers
2. **Better Zod inference** - Cleaner type inference with Zod schemas
3. **Simpler handler syntax** - Less boilerplate compared to tRPC procedures
4. **Framework agnostic** - Works seamlessly with Elysia

```typescript
// oRPC handler - clean and simple
export const requestsRouter = {
  create: protectedProcedure
    .input(createRequestSchema)
    .handler(async ({ input, context }) => {
      return await context.services.requests.create(
        input,
        context.session.user.id
      );
    }),
};
```

### Why No Repository Pattern

We intentionally **do not** use the Repository pattern. Here's why:

1. **Drizzle ORM already provides type-safe query building** - No need for another abstraction layer
2. **Services encapsulate data access + business logic** - Single responsibility at the service level
3. **Single database source** - We only use PostgreSQL, no need for database abstraction
4. **Unnecessary indirection** - Repositories would just proxy Drizzle calls

```typescript
// We prefer this (service directly uses Drizzle):
export const createRequestsService = (db: typeof _db) => ({
  async create(data: CreateRequestInput, userId: string) {
    const [request] = await db
      .insert(manpowerRequest)
      .values({ ...data, requesterId: userId })
      .returning();
    return request;
  },
});

// NOT this (unnecessary repository layer):
// class RequestRepository {
//   async create(data) { return await db.insert... }
// }
// class RequestService {
//   constructor(private repo: RequestRepository) {}
//   async create(data) { return await this.repo.create(data) }
// }
```

### Why Factory Functions for DI

We use factory functions for dependency injection instead of class-based DI containers:

```typescript
// ✅ Good: Factory function pattern
export const createRequestsService = (db: typeof _db) => ({
  async create(data: CreateRequestInput, userId: string) {
    // Implementation
  },

  async getById(id: string) {
    // Implementation
  },
});

export type RequestsService = ReturnType<typeof createRequestsService>;
```

**Benefits:**

- Simple and explicit dependencies
- Easy to test (just pass mock dependencies)
- No decorator magic or reflection
- Full TypeScript inference

---

## Critical Rules

### 1. NEVER Add Redundant Auth Checks in Protected Procedures

The `protectedProcedure` middleware **already handles authentication**. Adding another check is redundant and indicates misunderstanding of the architecture.

```typescript
// ❌ WRONG - Redundant auth check
protectedProcedure.handler(async ({ context }) => {
  if (!context.session?.user) {
    throw new ORPCError('UNAUTHORIZED'); // REMOVE THIS!
  }
  const userId = context.session.user.id;
  // ...
});

// ✅ CORRECT - Middleware handles auth
protectedProcedure.handler(async ({ context }) => {
  // Auth already verified by middleware
  // context.session is guaranteed to exist and have user
  const userId = context.session.user.id;
  return await context.services.requests.getByRequester(userId);
});
```

### 2. Always Use Transactions for Multi-Step Database Operations

When multiple database operations must succeed or fail together, wrap them in a transaction:

```typescript
// ✅ CORRECT - Transaction ensures atomicity
async transitionRequest(requestId: string, actorId: string, action: ApprovalAction) {
  return await db.transaction(async (tx) => {
    // All operations use `tx` instead of `db`
    const [request] = await tx
      .select()
      .from(manpowerRequest)
      .where(eq(manpowerRequest.id, requestId))
      .limit(1);

    if (!request) throw new Error("Request not found");

    // Update request status
    await tx
      .update(manpowerRequest)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(manpowerRequest.id, requestId));

    // Create approval log
    await tx.insert(approvalLog).values({
      requestId,
      actorId,
      action,
      performedAt: new Date(),
    });

    return newStatus;
  });
}

// ❌ WRONG - No transaction, partial failure possible
async transitionRequest(requestId: string, actorId: string, action: ApprovalAction) {
  await db.update(manpowerRequest)...; // Could succeed
  await db.insert(approvalLog)...;      // Could fail, leaving inconsistent state
}
```

### 3. Use Existing Interface Types for Infrastructure

Always type infrastructure services using the defined interfaces:

```typescript
// ✅ CORRECT - Using interface type
import type {
  StorageService,
  PdfService,
  CacheService,
} from './infrastructure/interfaces';

const storage: StorageService = new S3StorageService();
const pdf: PdfService = new PdfService();
const cache: CacheService = new MemoryCache();

// ❌ WRONG - Using concrete type directly
const storage = new S3StorageService(); // Loses interface abstraction
```

---

## File Organization

### Module Structure

Each feature module follows this structure:

```
packages/api/src/modules/{module}/
├── {module}.router.ts    # Route handlers
├── {module}.service.ts   # Business logic
├── {module}.schema.ts    # Zod validation schemas
└── index.ts              # Barrel exports
```

### Example: Candidates Module

```
packages/api/src/modules/candidates/
├── candidates.router.ts   # Route handlers (uploadCV, selectCandidate, getCandidates)
├── candidates.service.ts  # Service factory with business logic
├── candidates.schema.ts   # Zod schemas (uploadCvSchema, selectCandidateSchema)
└── index.ts               # export * from './candidates.router'
```

### Infrastructure Location

```
packages/api/src/infrastructure/
├── interfaces/           # Service interfaces (StorageService, PdfService, etc.)
│   ├── storage.interface.ts
│   ├── pdf.interface.ts
│   ├── cache.interface.ts
│   └── index.ts
├── storage/              # Storage implementations
│   └── s3.service.ts
├── pdf/                  # PDF implementations
│   └── pdf.service.ts
└── cache/                # Cache implementations
    └── memory.cache.ts
```

---

## Frontend Feature Organization

### Feature-Based Structure

Reusable feature code lives in `apps/web/src/features/{feature-name}/`. We follow a **lean (Option A)** approach where structure emerges based on complexity.

```
apps/web/src/features/manpower-requests/
├── index.ts                              # Barrel exports
├── use-manpower-request-form.ts          # Hooks (flat until >3 hooks)
├── manpower-request-form.tsx             # Components (flat until >5 components)
├── manpower-request-form-context.tsx     # Context providers
├── types.ts                              # Feature-specific types
└── form-sections/                        # Subfolders only when logically grouped
    └── ...
```

### When to Create Subfolders

| Condition                                     | Action                         |
| --------------------------------------------- | ------------------------------ |
| >3 hooks in a feature                         | Create `hooks/` subfolder      |
| >5 components in a feature                    | Create `components/` subfolder |
| Logically grouped files (e.g., form sections) | Create named subfolder         |
| Single file of a type                         | Keep flat                      |

### What Stays Route-Colocated

Files used **only** by a specific route stay in `_components/` or `_hooks/` within the `app` directory. This follows Next.js conventions and avoids over-engineering.

```
app/(protected)/requests/
├── _components/          # Route-specific UI (columns, data-grid)
├── _hooks/               # Route-specific hooks (use-requests-table)
├── page.tsx
└── [id]/page.tsx
```

### Import Pattern

Always use the barrel export for feature code to maintain a clean interface:

```typescript
// ✅ CORRECT - Use barrel export
import {
  ManpowerRequestForm,
  useManpowerRequestForm,
} from '@/features/manpower-requests';

// ❌ WRONG - Direct file import
import { ManpowerRequestForm } from '@/features/manpower-requests/manpower-request-form';
```

---

## Naming Conventions

| Type                            | Convention                    | Example                                    |
| ------------------------------- | ----------------------------- | ------------------------------------------ |
| **Files**                       | kebab-case                    | `manpower-requests.ts`, `approval-logs.ts` |
| **TypeScript types/interfaces** | PascalCase                    | `RequestStatus`, `CreateRequestInput`      |
| **Functions**                   | camelCase                     | `createRequestsService`, `getById`         |
| **Database tables**             | snake_case                    | `manpower_request`, `approval_log`         |
| **Constants**                   | UPPER_SNAKE_CASE              | `APPROVAL_ACTIONS`, `REQUEST_STATUSES`     |
| **Zod schemas**                 | camelCase + Schema suffix     | `createRequestSchema`, `uploadCvSchema`    |
| **Router objects**              | camelCase + Router suffix     | `requestsRouter`, `candidatesRouter`       |
| **Service factories**           | create + PascalCase + Service | `createRequestsService`                    |

---

## Import Ordering

Biome enforces this import order:

```typescript
// 1. External packages (alphabetical)
import { ORPCError } from '@orpc/server';
import { eq } from 'drizzle-orm';
import type { z } from 'zod';

// 2. Internal packages (@zenith-hr/*)
import { db } from '@zenith-hr/db';
import { manpowerRequest } from '@zenith-hr/db/schema/manpower-requests';

// 3. Relative imports
import { protectedProcedure } from '../../shared/middleware';
import type { StorageService } from '../../infrastructure/interfaces';
import { createRequestSchema } from './requests.schema';
```

---

## Error Handling

### Use ORPCError for API Errors

```typescript
import { ORPCError } from '@orpc/server';

// Standard error codes
throw new ORPCError('NOT_FOUND');
throw new ORPCError('BAD_REQUEST');
throw new ORPCError('UNAUTHORIZED');
throw new ORPCError('FORBIDDEN');

// With custom message
throw new ORPCError('CONFLICT', {
  message: 'Version mismatch - please refresh',
});
throw new ORPCError('NOT_FOUND', { message: 'Candidate not found' });
```

### Error Handling in Routers

```typescript
// Service throws generic errors
async selectCandidate(requestId: string, candidateId: string) {
  const [request] = await db.select()...;
  if (!request) throw new Error("NOT_FOUND");
  if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");
}

// Router maps to ORPCError
selectCandidate: protectedProcedure
  .input(selectCandidateSchema)
  .handler(async ({ input, context }) => {
    try {
      return await context.services.candidates.selectCandidate(
        input.requestId,
        input.candidateId
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message === "NOT_FOUND") {
          throw new ORPCError("NOT_FOUND");
        }
        if (error.message === "CANDIDATE_NOT_FOUND") {
          throw new ORPCError("NOT_FOUND", { message: "Candidate not found" });
        }
      }
      throw error;
    }
  }),
```

### Never Use `error: any`

```typescript
// ❌ WRONG
} catch (error: any) {
  console.log(error.message);
}

// ✅ CORRECT
} catch (error: unknown) {
  if (error instanceof Error) {
    console.log(error.message);
  }
  throw error;
}

// ✅ Also acceptable - helper function
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};
```

---

## Type Safety

### Rule 1: Never Use `any`

Use `unknown` with type guards instead:

```typescript
// ❌ WRONG
function processData(data: any) {
  return data.value;
}

// ✅ CORRECT
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: unknown }).value;
  }
  throw new Error('Invalid data');
}
```

### Rule 2: Always Type Function Parameters and Return Types (for services)

```typescript
// ✅ CORRECT - Explicit types
export const createRequestsService = (db: typeof _db) => ({
  async create(input: CreateRequestInput, userId: string): Promise<Request> {
    // Implementation
  },

  async getById(id: string): Promise<Request | undefined> {
    // Implementation
  },
});
```

### Rule 3: Use Zod Schemas for Runtime Validation

```typescript
// packages/api/src/modules/requests/requests.schema.ts
import { z } from 'zod';

export const createRequestSchema = z.object({
  positionDetails: z.object({
    title: z.string().min(1),
    department: z.string().min(1),
    description: z.string().optional(),
  }),
  budgetDetails: z.object({
    minSalary: z.number().positive(),
    maxSalary: z.number().positive(),
    currency: z.string().length(3),
  }),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
```

---

## Database Patterns

### Select with Where

```typescript
// Single record
const [request] = await db
  .select()
  .from(manpowerRequest)
  .where(eq(manpowerRequest.id, id))
  .limit(1);

// Multiple records
const requests = await db
  .select()
  .from(manpowerRequest)
  .where(eq(manpowerRequest.requesterId, userId));
```

### Insert with Returning

```typescript
const [newRequest] = await db
  .insert(manpowerRequest)
  .values({
    requesterId: userId,
    requestCode: this.generateRequestCode(),
    positionDetails: input.positionDetails,
    budgetDetails: input.budgetDetails,
    status: 'PENDING_MANAGER',
  })
  .returning();
```

### Update with Returning

```typescript
const [updated] = await db
  .update(manpowerRequest)
  .set({
    status: newStatus,
    version: existing.version + 1,
    updatedAt: new Date(),
  })
  .where(eq(manpowerRequest.id, id))
  .returning();
```

### Transactions

```typescript
await db.transaction(async (tx) => {
  // All queries use tx instead of db
  await tx.update(manpowerRequest)...;
  await tx.insert(approvalLog)...;
});
```

---

## Where to Add Things

| Task                       | Location                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------- |
| New API module             | `packages/api/src/modules/{name}/`                                                    |
| New route                  | `{module}.router.ts`, then add to `appRouter` in `packages/api/src/router.ts`         |
| New service                | `{module}.service.ts`, then wire in `packages/api/src/context.ts`                     |
| New database table         | `packages/db/src/schema/{table-name}.ts`, export in `packages/db/src/schema/index.ts` |
| New environment variable   | `packages/config/env.ts` schema + app-specific `env.ts`                               |
| New infrastructure service | `packages/api/src/infrastructure/{type}/` + interface in `interfaces/`                |
| New Zod schema             | `{module}.schema.ts`                                                                  |
| Shared types               | `packages/api/src/shared/types.ts`                                                    |

### Adding a New Module Checklist

1. Create folder: `packages/api/src/modules/{name}/`
2. Create schema: `{name}.schema.ts` with Zod validation
3. Create service: `{name}.service.ts` with factory function
4. Create router: `{name}.router.ts` with procedures
5. Create barrel: `index.ts` exporting router
6. Wire service in `packages/api/src/context.ts`
7. Add router to `packages/api/src/router.ts`

---

## Forbidden Patterns

| Pattern                                     | Why It's Forbidden              | Instead Use                          |
| ------------------------------------------- | ------------------------------- | ------------------------------------ |
| Direct database access in routers           | Bypasses service layer          | `context.services.{module}.method()` |
| Business logic in routers                   | Routers should only handle HTTP | Move logic to services               |
| Hardcoded environment paths                 | Breaks portability              | Use `env.ts` configuration           |
| `error: any` in catch blocks                | Loses type safety               | `error: unknown` with type guards    |
| Redundant auth checks in protected handlers | Already handled by middleware   | Remove the check                     |
| Missing transactions for related updates    | Data inconsistency risk         | Wrap in `db.transaction()`           |
| Using concrete types for infrastructure     | Loses abstraction benefits      | Use interface types                  |
| Nested routers with business logic          | Unclear responsibility          | Flat router + service call           |

---

## Testing

### Mocking Context

```typescript
// test-utils.ts
export function createTestContext(overrides?: Partial<Context>): Context {
  return {
    session: {
      user: { id: 'test-user-id', email: 'test@example.com' },
    },
    db: mockDb,
    services: {
      requests: createRequestsService(mockDb),
      candidates: createCandidatesService(mockDb, mockStorage),
      // ...
    },
    ...overrides,
  };
}
```

### Testing Services Directly

```typescript
// Test service methods directly, not through routers
describe("RequestsService", () => {
  const mockDb = createMockDb();
  const service = createRequestsService(mockDb);

  it("should create a request", async () => {
    const input = { positionDetails: {...}, budgetDetails: {...} };
    const result = await service.create(input, "user-123");

    expect(result.requestCode).toMatch(/^REQ-/);
    expect(result.status).toBe("PENDING_MANAGER");
  });
});
```

---

## Commit Messages

Follow conventional commit format:

| Type       | Usage            |
| ---------- | ---------------- | ---------------------------------------------- |
| `feat`     | New feature      | `feat: add contract generation`                |
| `fix`      | Bug fix          | `fix: resolve auth bypass in protected routes` |
| `refactor` | Code refactoring | `refactor: extract cache interface`            |
| `docs`     | Documentation    | `docs: update README`                          |
| `chore`    | Maintenance      | `chore: update dependencies`                   |
| `test`     | Tests            | `test: add workflow service tests`             |

Examples:

```
feat: add candidate CV upload endpoint
fix: resolve race condition in approval workflow
refactor: extract PDF generation to interface
docs: add AGENTS.md for AI assistants
chore: upgrade drizzle-orm to 0.44.7
```

---

## Quick Reference

### Commands

| Command               | Purpose                     |
| --------------------- | --------------------------- |
| `bun run dev`         | Start development servers   |
| `bun run check`       | Run Biome linter with fixes |
| `bun run check-types` | TypeScript type checking    |
| `bun run db:push`     | Push schema to database     |
| `bun run db:studio`   | Open Drizzle Studio         |
| `bun run db:generate` | Generate migrations         |
| `bun run build`       | Build all packages          |

### Key Files

| File                                    | Purpose                     |
| --------------------------------------- | --------------------------- |
| `packages/api/src/router.ts`            | Main app router             |
| `packages/api/src/context.ts`           | Request context factory     |
| `packages/api/src/shared/middleware.ts` | Auth middleware             |
| `packages/db/src/schema/`               | Database schema definitions |
| `packages/config/env.ts`                | Environment schema          |

### Common Import Paths

```typescript
// Database
import { db } from '@zenith-hr/db';
import { manpowerRequest } from '@zenith-hr/db/schema/manpower-requests';

// Auth
import { auth } from '@zenith-hr/auth';

// Middleware
import { protectedProcedure, publicProcedure } from '../../shared/middleware';

// Infrastructure interfaces
import type {
  StorageService,
  PdfService,
  CacheService,
} from '../../infrastructure/interfaces';

// oRPC
import { ORPCError } from '@orpc/server';

// Drizzle
import { eq, desc, and, sql } from 'drizzle-orm';
```

---

## Summary

When working on Zenith HR:

1. **Use services for all business logic** - Routers only handle HTTP
2. **Trust the middleware** - Don't add redundant auth checks
3. **Use transactions** - For multi-step database operations
4. **Follow interfaces** - For infrastructure abstractions
5. **Type everything** - No `any`, use `unknown` with guards
6. **Keep modules organized** - Router → Service → Schema pattern
7. **Use factory functions** - For dependency injection

When in doubt, look at existing modules like `candidates` or `workflow` for patterns to follow.
