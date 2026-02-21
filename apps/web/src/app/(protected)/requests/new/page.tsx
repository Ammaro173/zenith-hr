"use client";

import { History } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ManpowerRequestForm } from "@/features/manpower-requests";

export default function NewRequestPage() {
  const router = useRouter();

  return (
    <div className="container max-w-4xl space-y-8 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="font-bold text-3xl tracking-tight">
            Create Manpower Request
          </h1>
          <p className="text-muted-foreground">
            Fill out the form below to initiate a new hiring request.
          </p>
        </div>
        <Button className="h-9 gap-2" size="sm" variant="outline">
          <History className="size-4" />
          View History
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <ManpowerRequestForm
          mode="page"
          onCancel={() => router.push("/requests")}
          onSuccess={() => {
            router.push("/requests");
          }}
        />
      </div>

      <div className="flex justify-center pt-4">
        <p className="text-muted-foreground text-xs">
          Need help?{" "}
          <Link
            className="font-semibold underline"
            href={"/hiring-policy" as Route} //TODO remove
          >
            Read the Hiring Policy
          </Link>{" "}
          or contact HR Support.
        </p>
      </div>
    </div>
  );
}
