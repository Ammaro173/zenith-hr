import type { Metadata } from "next";
import { Suspense } from "react";
import { OnboardingClient } from "./view";

export const metadata: Metadata = {
  title: "Complete your details",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function InviteOnboardingPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <Suspense>
      <OnboardingClient id={id} />
    </Suspense>
  );
}
