import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getServerSession } from "@/lib/server-session";
import { RequestsDataGrid } from "./_components/requests-data-grid";

export const metadata: Metadata = {
  title: "Manpower Requests | Zenith HR",
  description: "Manage and track your recruitment requests in one place.",
};

export default async function RequestsPage() {
  const { data: session } = await getServerSession();
  const canCreateRequest = session?.user.role !== "EMPLOYEE";

  return (
    <div className="mx-auto flex max-w-(--breakpoint-2xl) flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-bold text-3xl text-black tracking-tight dark:text-white">
            Manpower Requests
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage and track your recruitment requests in one place.
          </p>
        </div>
        {canCreateRequest && (
          <Button
            asChild
            className="bg-black text-white shadow-xs hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            <Link className="gap-2" href="/requests/new" prefetch={false}>
              <Plus className="size-4" />
              New Request
            </Link>
          </Button>
        )}
      </div>

      <Suspense fallback={<PageSkeleton />}>
        <RequestsDataGrid />
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
