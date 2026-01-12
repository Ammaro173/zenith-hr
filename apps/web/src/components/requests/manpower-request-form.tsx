"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useManpowerRequestForm } from "@/hooks/use-manpower-request-form";
import { cn } from "@/lib/utils";
import {
  AdvancedOptionsSection,
  ContractBudgetSection,
  JustificationSection,
  PositionDetailsSection,
} from "./form-sections";
import { ManpowerRequestFormProvider } from "./manpower-request-form-context";

type ManpowerRequestFormProps = {
  mode?: "page" | "sheet";
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function ManpowerRequestForm({
  mode = "page",
  onSuccess,
  onCancel,
}: ManpowerRequestFormProps) {
  const { form, isPending, handleCancel } = useManpowerRequestForm({
    onSuccess,
    onCancel,
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
                Submit Request
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </div>
  );
}
