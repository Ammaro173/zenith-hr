import type { Metadata } from "next";
import { MemberCardView } from "./view";

export const metadata: Metadata = {
  title: "Membership Card",
};

type PageProps = {
  params: Promise<{ memberId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { memberId } = await params;

  return <MemberCardView memberId={memberId} />;
}
