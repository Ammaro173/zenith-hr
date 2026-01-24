import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ApprovalsTabs } from "./_components/approvals-tabs";

export const metadata: Metadata = {
  title: "Approvals | Zenith HR",
  description: "Inbox for pending approvals.",
};

export default function ApprovalsPage() {
  return (
    <div className="mx-auto flex max-w-(--breakpoint-2xl) flex-col gap-8 p-8">
      <div>
        <h1 className="font-bold text-3xl text-black tracking-tight dark:text-white">
          Approvals
        </h1>
        <p className="mt-1 text-muted-foreground">
          Review and process pending approvals assigned to you.
        </p>
      </div>

      <Suspense fallback={<PageSkeleton />}>
        <ApprovalsTabs />
      </Suspense>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="h-100 w-full" />
    </div>
  );
}
