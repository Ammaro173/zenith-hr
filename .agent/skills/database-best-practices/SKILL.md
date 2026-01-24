---
name: database-best-practices
description: Database usage patterns, transaction rules, and mocking strategies.
---

# Database Best Practices

## Core Patterns

### 1. Select with Where
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

### 2. Insert with Returning
**Rule**: Always use `.returning()` to get the created ID.

```typescript
const [newRequest] = await db
  .insert(manpowerRequest)
  .values({
    requesterId: userId,
    requestCode: this.generateRequestCode(),
    status: 'PENDING_MANAGER',
  })
  .returning();
```

### 3. Update with Returning
```typescript
const [updated] = await db
  .update(manpowerRequest)
  .set({
    status: newStatus,
    updatedAt: new Date(),
  })
  .where(eq(manpowerRequest.id, id))
  .returning();
```

### 4. Transactions (CRITICAL)
**Rule**: Wrap multi-step operations in `db.transaction`.

```typescript
await db.transaction(async (tx) => {
  // All queries MUST use `tx` instead of `db`
  await tx.update(manpowerRequest)...;
  await tx.insert(approvalLog)...;
});
```

## Testing / Mocking
Use this factory pattern for mocking Drizzle in tests:

```typescript
function createMockDb(overrides = {}) {
  return {
    select: mock(() => ({
      from: mock(() => ({
        where: mock(() => ({
          limit: mock(() => Promise.resolve([overrides])),
        })),
      })),
    })),
    insert: mock(() => ({ values: mock(() => ({ returning: ... })) })),
    transaction: mock(async (cb) => cb(createMockDb(overrides))),
  } as any;
}
```
