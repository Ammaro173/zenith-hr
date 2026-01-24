---
name: run-tests
description: Run tests for the project. Automatically maps modified files to their correct test suites.
---

# Run Tests

This skill helps run the correct tests based on the files you have modified.

## Critical Test Mappings

Always check if you have modified any of these sensitive files and run their specific suites:

| Modified File Category | Test Command |
| ---------------------- | ------------ |
| Workflow / Approvals | `bun test packages/api/src/modules/workflow` |
| Business Trips (Expenses) | `bun test packages/api/src/modules/business-trips` |
| Performance / Scores | `bun test packages/api/src/modules/performance` |
| Separations / Clearance | `bun test packages/api/src/modules/separations` |

## General Commands

- **Run All API Tests**: `bun test packages/api`
- **Run Specific File**: `bun test <path-to-test-file>`

## Rules

1.  **Always** run tests after modifying business logic in the files listed above.
2.  **Do NOT** run `bun test` on the root unless you intend to run ALL tests (slow). Scope it to the package or module.
