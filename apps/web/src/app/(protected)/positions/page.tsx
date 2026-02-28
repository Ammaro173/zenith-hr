import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PositionsDataGrid } from "./_components/positions-data-grid";

export const metadata: Metadata = {
  title: "Positions",
  description:
    "Manage positions that define seats, hierarchy levels, and department assignments.",
};

export default function PositionsPage() {
  return (
    <div className="mx-auto flex max-w-(--breakpoint-2xl) flex-col gap-8 p-8">
      <div>
        <h1 className="font-bold text-3xl text-black tracking-tight dark:text-white">
          Positions
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage positions that define seats in the organization hierarchy.
        </p>
      </div>

      <Suspense fallback={<PageSkeleton />}>
        <PositionsDataGrid />
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
