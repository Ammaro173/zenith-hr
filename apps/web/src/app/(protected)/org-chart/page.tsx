import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { OrgChartContainer } from "./_components/org-chart-container";

export const metadata: Metadata = {
  title: "Organization Chart",
  description: "Visualize your team's organizational hierarchy.",
};

export default function OrgChartPage() {
  return (
    <div className="mx-auto flex w-full max-w-(--breakpoint-2xl) flex-col gap-8 overflow-hidden p-8">
      <div>
        <h1 className="font-bold text-3xl text-black tracking-tight dark:text-white">
          Organization Chart
        </h1>
        <p className="mt-1 text-muted-foreground">
          Visualize your team's organizational hierarchy.
        </p>
      </div>

      <Suspense fallback={<PageSkeleton />}>
        <OrgChartContainer />
      </Suspense>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-10 w-48" />
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
