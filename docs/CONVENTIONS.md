# Conventions & Organization

## Naming Conventions

| Type          | Convention         | Example                 |
| :------------ | :----------------- | :---------------------- |
| **Files**     | kebab-case         | `manpower-requests.ts`  |
| **Types**     | PascalCase         | `RequestStatus`         |
| **Functions** | camelCase          | `createRequestsService` |
| **Tables**    | snake_case         | `manpower_request`      |
| **Constants** | UPPER_SNAKE        | `APPROVAL_ACTIONS`      |
| **Zod**       | camelCase + Schema | `createRequestSchema`   |

## File Organization

### Backend Modules

Use the **Create Module Skill** (`.agent/skills/create-module/SKILL.md`) to generate the strict structure:

- `router` (HTTP only)
- `service` (Business Logic)
- `schema` (Zod)
- `index` (Barrel)

### Frontend Features

Use the **Create Feature Skill** (`.agent/skills/create-feature/SKILL.md`) for the lean feature structure.

- Reusable code: `apps/web/src/features/{feature}/`
- Route-specific: `app/(protected)/requests/_components/`

## Import Ordering

Biome enforces:

1.  External packages
2.  Internal packages (`@zenith-hr/*`)
3.  Relative imports

## Hierarchy Conventions

- For writes, use `reportsToSlotCode` as the manager assignment input.
- For reads, prefer slot-derived manager metadata (`managerSlotCode`, `managerName`).
- Do not use legacy direct manager-id fields; manager relationships are slot-derived only.

## Commit Messages

Conventional Commits format:

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code change without behavioral change
- `docs`: Documentation only
- `test`: Adding tests
