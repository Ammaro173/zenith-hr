"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MemberStepper } from "@/components/onboarding/MemberStepper";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { StaffStepper } from "@/components/onboarding/StaffStepper";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { errorResponseSchema } from "@/contracts/common/schema";
import { tsr } from "@/lib/react-qeury-utils/tsr";
import { If, Show } from "@/utils";

export function OnboardingClient({ id }: { id: string }) {
  const { data, isLoading, isError, error } = tsr.members.findOne.useQuery({
    queryKey: ["invite", id],
    queryData: {
      params: { id },
    },
  });

  const [variant, setVariant] = useState<"member" | "staff">("member");
  const member = data?.body.member;
  const vehicle = data?.body?.vehicle;
  const { membershipType, status } = member ?? {};

  const isLocked = useMemo(() => {
    if (!status) {
      return false;
    }
    return [
      "submitted",
      "approved",
      "rejected",
      "expired",
      "cancelled",
    ].includes(status);
  }, [status]);

  const blockedInvite = useMemo(() => {
    if (!error || typeof error !== "object" || error === null) {
      return null;
    }

    const statusCode =
      "status" in error ? (error as { status?: number }).status : undefined;

    if (statusCode !== 403) {
      return null;
    }

    const rawBody =
      "body" in error ? (error as { body?: unknown }).body : undefined;
    const parsed = rawBody ? errorResponseSchema.safeParse(rawBody) : null;

    const parsedMessage = parsed?.success
      ? Array.isArray(parsed.data.message)
        ? parsed.data.message.join(", ")
        : parsed.data.message
      : null;
    const parsedError = parsed?.success ? parsed.data.error : null;

    return {
      message:
        parsedMessage ??
        parsedError ??
        "Access restricted. Please contact support for assistance.",
    };
  }, [error]);

  useEffect(() => {
    switch (membershipType) {
      case "staff":
        setVariant("staff");
        break;
      case "nardo":
      case "ascari":
      case "ibis":
      case "tango":
        setVariant("member");
        break;
      default:
        setVariant("member"); //TODO handle no membership type
        break;
    }
  }, [membershipType]);

  useEffect(() => {
    if (isError && !blockedInvite) {
      toast.error("Could not load invitation");
    }
  }, [blockedInvite, isError]);

  return (
    <OnboardingShell variant={variant}>
      <LoadingSwap isLoading={isLoading}>
        <Show>
          <Show.When isTrue={Boolean(blockedInvite)}>
            <div className="mx-auto w-full max-w-md rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center shadow">
              <h2 className="font-semibold text-destructive text-lg">
                Access restricted
              </h2>
              <p className="mt-2 text-muted-foreground text-sm">
                {blockedInvite?.message ??
                  "This invite link is no longer available. Please contact support for help."}
              </p>
            </div>
          </Show.When>
          <Show.Else>
            <If isTrue={isLocked}>
              <div className="mx-auto w-full max-w-md rounded-xl bg-background/80 p-6 text-center shadow">
                <p className="font-medium text-lg">
                  This invitation is not editable.
                </p>
                <p className="mt-2 text-muted-foreground text-sm">
                  Current status: {status}
                </p>
              </div>
            </If>

            <Show>
              <Show.When isTrue={variant === "staff"}>
                <StaffStepper id={id} member={member} />
              </Show.When>
              <Show.Else>
                <MemberStepper id={id} member={member} vehicle={vehicle} />
              </Show.Else>
            </Show>
          </Show.Else>
        </Show>
      </LoadingSwap>
    </OnboardingShell>
  );
}
