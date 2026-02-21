import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { UsersDataGrid } from "./_components/users-data-grid";

export const metadata: Metadata = {
  title: "User Directory",
  description: "View and manage organization users.",
};

export default function UsersPage() {
  return (
    <div className="mx-auto flex max-w-(--breakpoint-2xl) flex-col gap-8 p-8">
      <div>
        <h1 className="font-bold text-3xl text-black tracking-tight dark:text-white">
          User Directory
        </h1>
        <p className="mt-1 text-muted-foreground">
          View and manage organization users.
        </p>
      </div>

      <Suspense fallback={<PageSkeleton />}>
        <UsersDataGrid />
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
