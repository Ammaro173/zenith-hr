import type { Metadata } from "next";
import { JoinOnboardingClient } from "./view";

export const metadata: Metadata = {
  title: "Join the club",
};

export default function JoinOnboardingPage() {
  return <JoinOnboardingClient />;
}
