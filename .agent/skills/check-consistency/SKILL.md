---
name: check-consistency
description: Scans for forbidden patterns and architectural violations.
---

# Check Consistency

This skill scans the codebase for patterns explicitly forbidden in `AGENTS.md`.

## Forbidden Patterns to Check

### 1. `error: any` usage
**Pattern**: `catch\s*\(\s*error\s*:\s*any\s*\)`
**Fix**: Use `catch (error: unknown)` and type guards.

### 2. Direct Database Access in Routers
**Context**: Files ending in `.router.ts`
**Pattern**: `db\.(select|insert|update|delete|query)`
**Fix**: Move logic to a Service and call `context.services.<module>.<method>()`.

### 3. Redundant Auth Checks
**Context**: Files using `protectedProcedure`
**Pattern**: `if\s*\(!.*context\.session\.user\)` or `ORPCError\('UNAUTHORIZED'\)` inside a handler.
**Fix**: Remove the check. `protectedProcedure` guarantees `context.session.user` exists.

### 4. Direct Infrastructure Instantiation
**Pattern**: `new\s+S3StorageService\(\)` (or similar concrete classes)
**Fix**: Inject via interface, e.g., `storage: StorageService`.

### 5. Missing Barrel Exports
**Context**: `apps/web/src/features/*`
**Check**: Verify `index.ts` exists and exports public components.
**Fix**: Add valid `index.ts`.

## recommended Command

```bash
# Check for 'error: any'
grep -r "error: any" packages/api/src

# Check for db usage in routers
grep -r "db\." packages/api/src/modules/*/*.router.ts
```
