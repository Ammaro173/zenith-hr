"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AdvancedOptionsSection,
  ContractBudgetSection,
  JustificationSection,
  PositionDetailsSection,
} from "./form-sections";
import { ManpowerRequestFormProvider } from "./manpower-request-form-context";
import type { FormValues } from "./use-manpower-request-form";
import { useManpowerRequestForm } from "./use-manpower-request-form";

interface ManpowerRequestFormProps {
  initialValues?: Partial<FormValues>;
  mode?: "page" | "sheet";
  onCancel?: () => void;
  onSuccess?: () => void;
  requestId?: string;
  submitLabel?: string;
  successMessage?: string;
  version?: number;
}

export function ManpowerRequestForm({
  initialValues,
  mode = "page",
  onSuccess,
  onCancel,
  requestId,
  submitLabel,
  successMessage,
  version,
}: ManpowerRequestFormProps) {
  const { form, isEditing, isPending, handleCancel } = useManpowerRequestForm({
    initialValues,
    onSuccess,
    onCancel,
    requestId,
    successMessage,
    version,
  });

  return (
    <div
      className={cn(
        "space-y-6",
        mode === "sheet" ? "px-1" : "mx-auto max-w-3xl",
      )}
    >
      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <ManpowerRequestFormProvider form={form}>
          <div className="space-y-10">
            <PositionDetailsSection />
            <ContractBudgetSection />
            <JustificationSection />
            <AdvancedOptionsSection />
          </div>
        </ManpowerRequestFormProvider>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t pt-6 blur-bg-smoke/50 backdrop-blur-sm">
          <Button onClick={handleCancel} type="button" variant="outline">
            Cancel
          </Button>
          <form.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
              isSubmitting: state.isSubmitting,
            })}
          >
            {({ canSubmit, isSubmitting }) => (
              <Button
                disabled={!canSubmit || isSubmitting || isPending}
                type="submit"
              >
                {(isSubmitting || isPending) && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                {submitLabel ?? (isEditing ? "Save Changes" : "Submit Request")}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </div>
  );
}
