import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DepartmentsDataGrid } from "./_components/departments-data-grid";

export const metadata: Metadata = {
  title: "Departments",
  description: "View and manage organization departments.",
};

export default function DepartmentsPage() {
  return (
    <div className="mx-auto flex max-w-(--breakpoint-2xl) flex-col gap-8 p-8">
      <div>
        <h1 className="font-bold text-3xl text-black tracking-tight dark:text-white">
          Departments
        </h1>
        <p className="mt-1 text-muted-foreground">
          View and manage organization departments.
        </p>
      </div>

      <Suspense fallback={<PageSkeleton />}>
        <DepartmentsDataGrid />
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
