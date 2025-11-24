"use client";

import Image from "next/image";
import { useMemo } from "react";
import Loader from "@/components/loader";
import type { MemberStatus, MembershipType } from "@/contracts/member/schema";
import { memberKeys } from "@/lib/react-qeury-utils/member-keys";
import { tsr } from "@/lib/react-qeury-utils/tsr";
import { formatMemberName } from "@/lib/utils";

const MEMBERSHIP_VARIANTS: Record<
  MembershipType,
  {
    title: string;
    nameLabel: string;
    cardBg: string;
    topLeftLogo: string;
    bottomLeftLogo: string;
  }
> = {
  staff: {
    title: "QAS - Staff",
    nameLabel: "Staff Name",
    cardBg: "/images/staff-card-bg.png",
    topLeftLogo: "/images/logo.svg",
    bottomLeftLogo: "/images/logo.svg",
  },
  nardo: {
    title: "QAC - Nardo",
    nameLabel: "Full Name",
    cardBg: "/images/nardo-card-bg.png",
    topLeftLogo: "/images/audi-club.svg",
    bottomLeftLogo: "/images/audi-club.svg",
  },
  ascari: {
    title: "QAC - Ascari",
    nameLabel: "Full Name",
    cardBg: "/images/ascari-card-bg.png",
    topLeftLogo: "/images/audi-club.svg",
    bottomLeftLogo: "/images/audi-club.svg",
  },
  ibis: {
    title: "QAC - Ibis",
    nameLabel: "Full Name",
    cardBg: "/images/ibis-card-bg.png",
    topLeftLogo: "/images/audi-club.svg",
    bottomLeftLogo: "/images/audi-club.svg",
  },
  tango: {
    title: "QAC - Tango",
    nameLabel: "Full Name",
    cardBg: "/images/tango-card-bg.png",
    topLeftLogo: "/images/audi-club.svg",
    bottomLeftLogo: "/images/audi-club.svg",
  },
};

const STATUS_LABELS: Partial<Record<MemberStatus, string>> = {
  approved: "Active",
};

const fallbackStatus = (status: MemberStatus) =>
  status
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (match) => match.toUpperCase());

export function MemberCardView({ memberId }: { memberId: string }) {
  const queryKey = useMemo(() => memberKeys.detail(memberId), [memberId]);

  const { data, isLoading, isError } = tsr.members.findOne.useQuery({
    queryKey,
    queryData: {
      params: { id: memberId },
    },
  });

  if (isLoading) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background">
        <Loader />
      </main>
    );
  }

  if (isError || !data?.body.member) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
          <span className="font-semibold text-lg">Member not found</span>
          <span className="mt-2 text-muted-foreground text-sm">
            Make sure the link is correct or try again later.
          </span>
        </div>
      </main>
    );
  }

  const member = data.body.member;

  const membershipConfig = MEMBERSHIP_VARIANTS[member.membershipType];

  const fullName = formatMemberName(
    member.firstName,
    member.lastName,
    member.email
  );

  const statusLabel =
    STATUS_LABELS[member.status] ?? fallbackStatus(member.status);

  const memberIdLabel = member.memberId ?? "Pending";

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6 sm:max-w-lg lg:max-w-2xl">
        <section className="flex flex-1 items-center justify-center pb-16">
          <article
            aria-label={`${membershipConfig.title} membership card for ${fullName}`}
            className="relative w-full max-w-sm overflow-hidden rounded-none border border-white/30 text-white shadow-2xl transition sm:max-w-md lg:max-w-lg"
          >
            <Image
              alt="Membership card background"
              fill
              priority
              sizes="(max-width: 768px) 360px, 480px"
              src={membershipConfig.cardBg}
            />

            <div className="relative flex h-full min-h-[500px] flex-col justify-between px-4 pt-16">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col">
                  <span className="font-medium text-md text-white">
                    {membershipConfig.nameLabel}
                  </span>
                  <span className="font-bold text-3xl text-white">
                    {fullName}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="font-medium text-white text-xs">
                    MEMBER ID
                  </span>
                  <span className="font-bold text-white text-xl">
                    {memberIdLabel}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="font-medium text-sm text-white">Status</span>
                  <span className="font-bold text-white text-xl">
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
