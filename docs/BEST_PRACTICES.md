# Best Practices & Rules

## Critical Rules

### 1. No Redundant Auth Checks
The `protectedProcedure` middleware handles authentication. Do NOT check `context.session.user` again in handlers.

### 2. Transactions
**Goal**: Atomicity.
**Rule**: Always use `db.transaction` when performing multiple write operations (e.g., update request + insert log).

## Error Handling

*   **API Errors**: Throw `ORPCError` (e.g., `ORPCError('NOT_FOUND')`).
*   **Catch Blocks**: Never use `error: any`. Use `unknown` and type guards.

## Type Safety

*   **No Any**: Use `unknown` or specific types.
*   **Explicit Returns**: Services must have explicit return types.
*   **Zod**: Use Zod for all runtime validation.

## Principles (Pragmatic)

*   **DRY**: Use shared utilities (`packages/api/src/shared/utils.ts`) instead of repeating logic.
*   **YAGNI**: Do not over-engineer. No generic repositories, no complex state machines unless absolutely necessary.
*   **SOLID**: Services are Single Responsibility (mostly). Infrastructure is Interface Segregated.

## Testing

Use the **Run Tests Skill** (`.agent/skills/run-tests/SKILL.md`).
*   **Yes**: Workflow transitions, financial math, scores.
*   **No**: Simple CRUD, UI components.
