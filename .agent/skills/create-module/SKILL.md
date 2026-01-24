---
name: create-module
description: Scaffolds a new backend API module following strict project architecture.
---

# Create Backend Module

This skill creates a new API module in `packages/api/src/modules/` following the strict 4-file structure defined in `AGENTS.md`.

## Workflow

1.  **Create Directory**: `packages/api/src/modules/<module-name>/`
2.  **Create Schema**: `<module-name>.schema.ts`
3.  **Create Service**: `<module-name>.service.ts`
4.  **Create Router**: `<module-name>.router.ts`
5.  **Create Barrel**: `index.ts`
6.  **Wire Context**: Add service to `packages/api/src/context.ts` (Requires manual step or edit)
7.  **Wire Router**: Add router to `packages/api/src/router.ts` (Requires manual step or edit)

## File Templates

### 1. Schema (`<module-name>.schema.ts`)

```typescript
import { z } from 'zod';

// TODO: Define your schemas here
export const create<ModuleName>Schema = z.object({
  // ...
});

export type Create<ModuleName>Input = z.infer<typeof create<ModuleName>Schema>;
```

### 2. Service (`<module-name>.service.ts`)

**CRITICAL**: Must use Factory Function pattern, NOT classes.

```typescript
import type { Database } from '@zenith-hr/db';
import type { <ModuleName>Schema } from './<module-name>.schema';

export const create<ModuleName>Service = (db: Database) => ({
  async create(input: any, actorId: string) {
    // TODO: Implement business logic
    // const [result] = await db.insert(...).values({...}).returning();
    // return result;
    return { id: 'todo' };
  },

  async getById(id: string) {
    // TODO: Implement getById
  },
});

export type <ModuleName>Service = ReturnType<typeof create<ModuleName>Service>;
```

### 3. Router (`<module-name>.router.ts`)

**CRITICAL**: Do NOT implement business logic here. Call the service.

```typescript
import { protectedProcedure } from '../../shared/middleware';
import { create<ModuleName>Schema } from './<module-name>.schema';
import { ORPCError } from '@orpc/server';

export const <moduleName>Router = {
  create: protectedProcedure
    .input(create<ModuleName>Schema)
    .handler(async ({ input, context }) => {
        // Use the service from context
      return await context.services.<moduleName>.create(input, context.session.user.id);
    }),
};
```

### 4. Barrel (`index.ts`)

```typescript
export * from './<module-name>.router';
export * from './<module-name>.schema';
export * from './<module-name>.service';
```

## Wiring Instructions

After creating the files, you MUST update the following files:

1.  **`packages/api/src/context.ts`**:
    *   Import `create<ModuleName>Service`.
    *   Add `<moduleName>: create<ModuleName>Service(db)` to the `services` object.

2.  **`packages/api/src/router.ts`**:
    *   Import `<moduleName>Router`.
    *   Add `<moduleName>: <moduleName>Router` to the `appRouter` object.
