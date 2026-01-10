"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdvancedOptionsSection,
  ContractBudgetSection,
  JustificationSection,
  PositionDetailsSection,
} from "./form-sections";
import type { ManpowerRequestFormType } from "./types";

type ManpowerRequestFormSimpleProps = {
  form: ManpowerRequestFormType;
  isPending: boolean;
  onCancel: () => void;
};

export function ManpowerRequestFormSimple({
  form,
  isPending,
  onCancel,
}: ManpowerRequestFormSimpleProps) {
  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <div className="space-y-10">
        <PositionDetailsSection form={form} />
        <ContractBudgetSection form={form} />
        <JustificationSection form={form} />
        <AdvancedOptionsSection form={form} />
      </div>

      <div className="flex items-center justify-end gap-3 border-t pt-6">
        <Button onClick={onCancel} type="button" variant="outline">
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
  );
}
