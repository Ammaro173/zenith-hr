import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessTripsDataGrid } from "./_components/business-trips-data-grid";

export const metadata: Metadata = {
  title: "Business Trips",
  description: "Manage and track your business trips and expenses.",
};

export default function BusinessTripsPage() {
  return (
    <div className="mx-auto flex max-w-(--breakpoint-2xl) flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-bold text-3xl text-black tracking-tight dark:text-white">
            Business Trips
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage and track your business trips and expenses.
          </p>
        </div>
        <Button
          asChild
          className="bg-black text-white shadow-xs hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
        >
          <Link className="gap-2" href="/business-trips/new" prefetch={false}>
            <Plus className="size-4" />
            New Trip
          </Link>
        </Button>
      </div>

      <Suspense fallback={<PageSkeleton />}>
        <BusinessTripsDataGrid />
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
