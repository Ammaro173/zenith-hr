import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { JobDescriptionsDataGrid } from "./_components/job-descriptions-data-grid";

export const metadata: Metadata = {
  title: "Job Descriptions | Zenith HR",
  description:
    "Manage role templates that define assigned role and default department for positions.",
};

export default function JobDescriptionsPage() {
  return (
    <div className="mx-auto flex max-w-(--breakpoint-2xl) flex-col gap-8 p-8">
      <div>
        <h1 className="font-bold text-3xl text-black tracking-tight dark:text-white">
          Job Descriptions
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage templates that set the assigned role and default department for
          linked positions.
        </p>
      </div>

      <Suspense fallback={<PageSkeleton />}>
        <JobDescriptionsDataGrid />
      </Suspense>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Skeleton className="h-100 w-full" />
    </div>
  );
}
