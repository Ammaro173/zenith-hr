"use client";

import * as React from "react";
import { useManpowerRequestForm } from "@/hooks/use-manpower-request-form";
import { cn } from "@/lib/utils";
import { ManpowerRequestFormSimple } from "./manpower-request-form-simple";
import { ManpowerRequestFormWizard } from "./manpower-request-form-wizard";

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
  const [useWizard, setUseWizard] = React.useState(false);

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
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h2 className="font-semibold text-lg tracking-tight">
            Form Experience
          </h2>
          <p className="text-muted-foreground text-sm">
            Choose your preferred way to fill out this request.
          </p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-lg border bg-muted p-1">
          <button
            className={cn(
              "rounded-md px-3 py-1.5 font-medium text-sm transition-all",
              useWizard
                ? "text-muted-foreground hover:text-foreground"
                : "bg-background shadow-sm",
            )}
            onClick={() => setUseWizard(false)}
            type="button"
          >
            Simple
          </button>
          <button
            className={cn(
              "rounded-md px-3 py-1.5 font-medium text-sm transition-all",
              useWizard
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setUseWizard(true)}
            type="button"
          >
            Wizard
          </button>
        </div>
      </div>

      {useWizard ? (
        <ManpowerRequestFormWizard
          form={form}
          isPending={isPending}
          onCancel={handleCancel}
        />
      ) : (
        <ManpowerRequestFormSimple
          form={form}
          isPending={isPending}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
