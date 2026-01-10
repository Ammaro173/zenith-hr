"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Stepper,
  StepperContent,
  StepperItem,
  StepperList,
  StepperNextTrigger,
  StepperPrevTrigger,
  StepperTrigger,
} from "@/components/ui/stepper";
import {
  AdvancedOptionsSection,
  ContractBudgetSection,
  JustificationSection,
  PositionDetailsSection,
} from "./form-sections";
import type { ManpowerRequestFormType } from "./types";

type ManpowerRequestFormWizardProps = {
  form: ManpowerRequestFormType;
  isPending: boolean;
  onCancel: () => void;
};

const STEPS = [
  { value: "position", label: "Position Details" },
  { value: "contract", label: "Contract & Budget" },
  { value: "justification", label: "Justification & Advanced" },
] as const;

export function ManpowerRequestFormWizard({
  form,
  isPending,
  onCancel,
}: ManpowerRequestFormWizardProps) {
  const [currentStep, setCurrentStep] = React.useState<string>(STEPS[0].value);

  // Validation logic when moving between steps
  const handleValidate = async (_value: string, direction: "next" | "prev") => {
    if (direction === "prev") {
      return true;
    }

    // Validate current fields before going to next step
    if (currentStep === "position") {
      // Validate position fields
      await form.validateField("positionDetails.title", "submit");
      await form.validateField("positionDetails.department", "submit");
      await form.validateField("requestType", "submit");

      const state = form.state.fieldMeta;
      const positionTitleMeta =
        state["positionDetails.title" as keyof typeof state];
      const departmentMeta =
        state["positionDetails.department" as keyof typeof state];
      const requestTypeMeta = state.requestType;
      const hasErrors =
        !!(positionTitleMeta as { errors: unknown[] } | undefined)?.errors
          ?.length ||
        !!(departmentMeta as { errors: unknown[] } | undefined)?.errors
          ?.length ||
        !!requestTypeMeta?.errors?.length;

      return !hasErrors;
    }

    if (currentStep === "contract") {
      await form.validateField("contractDuration", "submit");
      await form.validateField("salaryRangeMin", "submit");
      await form.validateField("salaryRangeMax", "submit");

      const state = form.state.fieldMeta;
      const hasErrors =
        !!state.contractDuration?.errors?.length ||
        !!state.salaryRangeMin?.errors?.length ||
        !!state.salaryRangeMax?.errors?.length;

      return !hasErrors;
    }

    return true;
  };

  const lastStepValue = STEPS.at(-1)?.value;

  return (
    <Stepper
      onValidate={handleValidate}
      onValueChange={setCurrentStep}
      value={currentStep}
    >
      <StepperList className="mb-8 overflow-x-auto pb-2">
        {STEPS.map((step, index) => (
          <StepperItem
            className="min-w-fit"
            key={step.value}
            value={step.value}
          >
            <StepperTrigger className="gap-2">
              <div className="flex size-6 items-center justify-center rounded-full border font-bold text-xs leading-none">
                {index + 1}
              </div>
              <span className="whitespace-nowrap font-medium text-sm">
                {step.label}
              </span>
            </StepperTrigger>
          </StepperItem>
        ))}
      </StepperList>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <StepperContent className="space-y-6" value="position">
          <PositionDetailsSection form={form} />
        </StepperContent>

        <StepperContent className="space-y-6" value="contract">
          <ContractBudgetSection form={form} />
        </StepperContent>

        <StepperContent className="space-y-6" value="justification">
          <JustificationSection form={form} />
          <AdvancedOptionsSection form={form} />
        </StepperContent>

        <div className="mt-10 flex items-center justify-between border-t pt-6">
          <div className="flex gap-3">
            <StepperPrevTrigger asChild>
              <Button type="button" variant="outline">
                Previous
              </Button>
            </StepperPrevTrigger>
            <Button
              onClick={() => {
                form.reset();
                onCancel();
              }}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>

          <div className="flex gap-3">
            {currentStep !== lastStepValue ? (
              <StepperNextTrigger asChild>
                <Button type="button">Next Step</Button>
              </StepperNextTrigger>
            ) : (
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
            )}
          </div>
        </div>
      </form>
    </Stepper>
  );
}
