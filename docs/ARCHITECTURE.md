# Architecture & Infrastructure

## Architectural Decisions

### 1. oRPC over tRPC

We use [oRPC](https://orpc.dev) for:

- OpenAPI-first design (automatic specs)
- Better Zod inference
- Simpler handler syntax
- Framework agnosticism (works with Elysia)

### 2. No Repository Pattern

We **intentionally do not** use the Repository pattern.

- **Why**: Drizzle ORM is already a type-safe abstraction. Services should encapsulate business logic + data access directly.
- **Benefit**: Reduces unnecessary indirection.

### 3. Factory Functions for Services

We use factory functions for DI instead of classes.

```typescript
// ✅ Good: Factory function pattern
export const createRequestsService = (db: Database) => ({
  async create(data: Input) { ... }
});
```

- **Benefits**: Simple dependency injection, easy testing, better type inference.

## Infrastructure

Infrastructure services live in `packages/api/src/infrastructure/`.

**Rule**: Always type infrastructure services using the defined interfaces in `infrastructure/interfaces/`.

```typescript
// ✅ CORRECT
import type { StorageService } from './infrastructure/interfaces';
const storage: StorageService = new S3StorageService();

// ❌ WRONG
const storage = new S3StorageService();
```

## Organizational Hierarchy

- Source of truth for reporting lines is slot data (`position_slot`, `slot_assignment`, `slot_reporting_line`).
- Services should resolve manager relationships from active slot assignments rather than recursive user-manager foreign keys.
- Public API contracts should expose slot-based manager metadata (`managerSlotCode`) for assignment/edit workflows.
