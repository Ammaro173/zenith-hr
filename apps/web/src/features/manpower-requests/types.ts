import type { useManpowerRequestForm } from "./use-manpower-request-form";

// Infer form type from the hook's return type
export type ManpowerRequestFormType = ReturnType<
  typeof useManpowerRequestForm
>["form"];
