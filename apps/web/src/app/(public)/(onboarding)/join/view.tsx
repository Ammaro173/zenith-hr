"use client";

import { JoinStepper } from "@/components/onboarding/JoinStepper";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { LoadingSwap } from "@/components/ui/loading-swap";

export function JoinOnboardingClient() {
  return (
    <OnboardingShell variant="member">
      <LoadingSwap isLoading={false}>
        <JoinStepper />
      </LoadingSwap>
    </OnboardingShell>
  );
}
