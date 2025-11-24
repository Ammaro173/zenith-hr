"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  StepperContent,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperList,
  StepperNextTrigger,
  StepperPrevTrigger,
  Stepper as StepperRoot,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/components/ui/stepper";
import { For, If, Image, Show } from "@/utils";

export type Step = {
  id: string;
  title: string;
  subtitle?: string;
  label?: string;
  render: () => ReactNode;
  canNext?: boolean;
  hideContent?: boolean;
  hideSubtitle?: boolean;
};

type StepperProps = {
  steps: Step[];
  onSubmit: () => Promise<void> | void;
  isSubmitting?: boolean;
  nextLabel?: string;
  submitLabel?: string;
  backLabel?: string;
  logo?: string;
  startLabel?: string;
};

export function Stepper({
  steps,
  onSubmit,
  isSubmitting,
  nextLabel = "Next",
  submitLabel = "Submit",
  backLabel = "Back",
  logo,
  startLabel = "Lets Start",
}: StepperProps) {
  const [value, setValue] = useState(() => steps[0]?.id ?? "");
  const activeValue = useMemo(() => {
    if (steps.length === 0) {
      return "";
    }
    return steps.some((step) => step.id === value) ? value : steps[0].id;
  }, [steps, value]);

  const currentIndex = Math.max(
    steps.findIndex((step) => step.id === activeValue),
    0
  );
  const currentStep = steps[currentIndex];
  const lastIndex = steps.length - 1;
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === lastIndex;
  const canAdvance = steps[currentIndex]?.canNext !== false;

  const handleValidate = useCallback(
    (nextValue: string, direction: "next" | "prev") => {
      if (direction === "prev") {
        return true;
      }

      const targetIndex = steps.findIndex((step) => step.id === nextValue);
      if (targetIndex === -1) {
        return false;
      }

      if (targetIndex > currentIndex + 1) {
        return false;
      }

      return steps[currentIndex]?.canNext !== false;
    },
    [currentIndex, steps]
  );

  const handleSubmit = useCallback(() => {
    const maybePromise = onSubmit();
    if (
      maybePromise &&
      typeof (maybePromise as Promise<unknown>).then === "function"
    ) {
      (maybePromise as Promise<unknown>).catch(() => {
        /* handled by caller */
      });
    }
  }, [onSubmit]);

  useEffect(() => {
    if (activeValue !== value) {
      setValue(activeValue);
    }
  }, [activeValue, value]);

  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="flex h-full flex-col pb-4">
      <If isTrue={!!logo}>
        <div className="mb-8 pt-8 md:mb-10 md:pt-10 lg:mb-12 lg:pt-12">
          <Image
            alt="Logo"
            className="mx-auto h-10 w-auto object-contain md:h-12 lg:h-14"
            fallback={logo!}
            src={logo!}
          />
        </div>
      </If>

      <StepperRoot
        className="flex-1"
        onValidate={handleValidate}
        onValueChange={setValue}
        value={activeValue}
      >
        <StepperList className="flex w-full items-start">
          <For
            each={steps}
            render={(step, index) => {
              const disableTrigger =
                index > currentIndex + 1 ||
                (index === currentIndex + 1 && !canAdvance);

              return (
                <StepperItem key={step.id} value={step.id}>
                  <StepperTrigger
                    className="flex size-20 flex-col items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-center text-white/70 transition data-[state=active]:border-white data-[state=completed]:border-white data-[state=active]:bg-white data-[state=completed]:bg-white data-[state=active]:text-black data-[state=completed]:text-black sm:size-30"
                    disabled={disableTrigger}
                  >
                    <StepperIndicator className="size-9 border-white/30 bg-transparent text-white data-[state=active]:border-transparent data-[state=completed]:border-transparent data-[state=active]:bg-white data-[state=completed]:bg-white data-[state=active]:text-black data-[state=completed]:text-black" />
                    <StepperTitle className="font-semibold text-current text-xs uppercase tracking-wide">
                      {step.label ?? step.title}
                    </StepperTitle>
                    <If isTrue={!!step.subtitle}>
                      <StepperDescription className="hidden text-[11px] text-white/60 data-[state=active]:text-black/70 data-[state=completed]:text-black/70 lg:block">
                        <If isTrue={!step.hideSubtitle}>{step.subtitle}</If>
                      </StepperDescription>
                    </If>
                  </StepperTrigger>
                  <StepperSeparator className="flex-1 bg-white/15 data-[state=active]:bg-white data-[state=completed]:bg-white" />
                </StepperItem>
              );
            }}
          />
        </StepperList>

        <div className="flex flex-1 flex-col">
          <div className="mb-4 text-white">
            <h1 className="mb-2 font-semibold text-xl">{currentStep?.title}</h1>
            <Show>
              <Show.When isTrue={!!currentStep?.subtitle}>
                <p className="text-base text-white/80 md:text-lg lg:text-xl">
                  {currentStep.subtitle}
                </p>
              </Show.When>
            </Show>
          </div>

          <div className="min-h-0 flex-1">
            <For
              each={steps}
              render={(step) => (
                <StepperContent
                  className="flex h-full flex-col"
                  key={step.id}
                  value={step.id}
                >
                  <If isTrue={!step.hideContent}>
                    <div className="min-h-0 flex-1 overflow-auto rounded-3xl bg-black/40 p-8 shadow-lg backdrop-blur-sm md:p-10 lg:p-12">
                      {step.render()}
                    </div>
                  </If>
                </StepperContent>
              )}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4 lg:mt-8 lg:gap-6">
          <If isTrue={!isFirstStep}>
            <StepperPrevTrigger asChild>
              <Button
                className="flex-1 rounded-none border-white/20 bg-transparent text-white hover:bg-white/10 md:px-8 md:py-3 lg:px-10 lg:py-4"
                type="button"
                variant="outline"
              >
                {backLabel}
              </Button>
            </StepperPrevTrigger>
          </If>

          <Show>
            <Show.When isTrue={isLastStep}>
              <Button
                className="flex-1 rounded-none bg-white text-black hover:bg-white/90 md:px-8 md:py-3 lg:px-10 lg:py-4"
                disabled={isSubmitting}
                onClick={handleSubmit}
                type="button"
              >
                {isSubmitting ? "Submitting..." : submitLabel}
              </Button>
            </Show.When>
            <Show.Else>
              <StepperNextTrigger asChild>
                <Button
                  className={`rounded-none bg-white text-black hover:bg-white/90 md:px-8 md:py-3 lg:px-10 lg:py-4 ${isFirstStep ? "w-full" : "flex-1"}`}
                  type="button"
                >
                  {isFirstStep ? startLabel : nextLabel}
                </Button>
              </StepperNextTrigger>
            </Show.Else>
          </Show>
        </div>
      </StepperRoot>
    </div>
  );
}
