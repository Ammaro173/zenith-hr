---
name: create-feature
description: Scaffolds a new frontend feature following the 'lean' structure.
---

# Create Frontend Feature

This skill creates a new feature in `apps/web/src/features/` following the Lean (Option A) structure defined in `AGENTS.md`.

## Workflow

1.  **Create Directory**: `apps/web/src/features/<feature-name>/`
2.  **Create Barrel**: `index.ts`
3.  **Create Initial Component**: `<feature-name>-list.tsx` (or similar starting point)

## File Templates

### 1. Initial Component (`<feature-name>-list.tsx`)

```typescript
import type { FC } from 'react';

export const <FeatureName>List: FC = () => {
  return (
    <div>
      <h1><FeatureName> List</h1>
    </div>
  );
};
```

### 2. Barrel (`index.ts`)

**CRITICAL**: All feature code must be accepted via this barrel file.

```typescript
export * from './<feature-name>-list';
// Export other components/hooks as given
```

## Rules

*   **Flat Structure**: Start flat. Do NOT create `components/` or `hooks/` subfolders until you have >5 components or >3 hooks.
*   **Colocation**: Route-specific components stay in `app/(protected)/.../_components/`. Only REUSABLE feature code goes here.
