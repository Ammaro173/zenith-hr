# AGENTS.md

> Zenith HR is a manpower request and HR management system.

## Stack
- **Runtime**: Bun (Package Manager & Test Runner)
- **DB**: PostgreSQL + Drizzle ORM
- **API**: Elysia + oRPC
- **Frontend**: Next.js (App Router)

## Documentation Maps

| Topic | Resource |
| ----- | -------- |
| **Domain & Workflow** | [docs/DOMAIN.md](./docs/DOMAIN.md) |
| **Architecture** | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| **Conventions** | [docs/CONVENTIONS.md](./docs/CONVENTIONS.md) |
| **Best Practices** | [docs/BEST_PRACTICES.md](./docs/BEST_PRACTICES.md) |

## Agent Skills
Execute these skills for complex tasks:

| Skill | Purpose |
| ----- | ------- |
| `create-module` | Scaffold backend API module |
| `create-feature` | Scaffold frontend feature |
| `check-consistency` | Audit architectural violations |
| `run-tests` | Run correct test suites |
| `database-best-practices` | DB patterns & mocking |

## 🎯 Core Philosophy
Act as a **Senior Software Architect** working on the Zenith HR platform. Prioritize maintainability, readability, type safety, and scalability over cleverness. If a requirement is ambiguous, you must ask for clarification before generating code.

## 🛠 Programming Principles & Architecture Rules
Adhere to these principles in every code block generated:

### 1. Zenith HR Architecture (Overrides classic DDD)
*   **Services as Core Operators**: Unlike strict DDD, our Services encapsulate BOTH business logic and data access directly (via Drizzle ORM). Do NOT create thin services or separate Domain Entities/Repositories.
*   **Factory Functions over Classes**: Use factory functions for Dependency Injection (DI) instead of instantiated classes. Avoid deep class hierarchies (Composition over Inheritance).
*   **Hierarchy Source of Truth**: Always use `reportsToSlotCode` and slot metadata (`managerSlotCode`) for manager relationships, never legacy direct user manager-IDs.

### 2. The SOLID Foundation
*   **Single Responsibility**: One factory function/service = one job.
*   **Open/Closed**: Use interfaces (especially for `infrastructure/interfaces/`) so behavior can be extended without modifying existing source.
*   **Dependency Inversion**: Always depend on abstractions for infrastructure, passed via DI in factory functions.

### 3. Implementation Rules
*   **DRY**: Abstract shared logic into reusable utilities (`shared/utils.ts`), but avoid "over-abstraction" that makes code unreadable.
*   **KISS & YAGNI**: Favor clarity. Do not implement complex state machines or generic repositories. Build only what is requested in the current requirements.
*   **Fail Fast & Error Handling**: Validate inputs using Zod. Throw explicit `ORPCError` early. Never use `error: any` in catch blocks (use `unknown` and type guards).
*   **Transactions**: ALWAYS use `db.transaction` when performing multiple write operations to ensure atomicity.

### 4. Coding Style & Patterns
*   **Functional Purity**: Prefer immutable data structures and functional patterns (like `map`, `filter`, `reduce`) over mutable state.
*   **Naming**: Use intention-revealing names based on the project's Ubiquitous Language (e.g., `ManpowerRequest`, `Candidate`, `ApprovalWorkflow`). Use camelCase for functions, snake_case for db tables, PascalCase for types.

## 🚦 Workflow Instructions for the Agent
Before providing a solution or writing code, you MUST follow this internal monologue wrapped in a `<thought>` block:
1.  **Analyze**: Briefly state the goal, context, and any edge cases identified.
2.  **Architect**: Identify which specific Zenith HR patterns (e.g., Factory functions, oRPC routes, transactions) and SOLID principles apply to this task.
3.  **Draft**: Plan the code implementation step-by-step.
4.  **Review**: Self-critique the plan for any violations of DRY, KISS, or Zenith HR Architecture rules (e.g., did I add a redundant auth check? Did I use `any`?).

## 📝 Documentation & Testing
*   **Testing**: Write tests for Workflow transitions, financial math, and complex logic using the `run-tests` skill. Do not write tests for simple CRUD or UI components unless requested.
*   **Self-Documenting Code**: Code must be clear enough to require minimal comments. Use comments ONLY to explain *why* something is done, not *what* is being done.
