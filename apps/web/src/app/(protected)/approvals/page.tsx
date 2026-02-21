import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { UnifiedInbox } from "./_components/unified-inbox";

export const metadata: Metadata = {
  title: "Approvals Inbox | Zenith HR",
  description: "Inbox for pending approvals.",
};

export default function ApprovalsPage() {
  return (
    <div className="flex h-[calc(100vh-(--spacing(16)))] w-full flex-col bg-background">
      <Suspense fallback={<PageSkeleton />}>
        <UnifiedInbox />
      </Suspense>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="flex h-full w-full rounded-md border">
      <div className="w-80 border-r p-4">
        <Skeleton className="mb-4 h-10 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="mb-8 h-12 w-1/3" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[80%]" />
        </div>
      </div>
    </div>
  );
}
