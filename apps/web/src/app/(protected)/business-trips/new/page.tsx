"use client";

import { History } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BusinessTripForm } from "@/features/business-trips";

export default function NewBusinessTripPage() {
  const router = useRouter();

  return (
    <div className="container max-w-4xl space-y-8 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="font-bold text-3xl tracking-tight">
            Create Business Trip
          </h1>
          <p className="text-muted-foreground">
            Fill out the form below to submit a new business trip request.
          </p>
        </div>
        <Button className="h-9 gap-2" size="sm" variant="outline">
          <History className="size-4" />
          View History
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <BusinessTripForm
          mode="page"
          onCancel={() => router.push("/business-trips")}
          onSuccess={() => {
            router.push("/business-trips");
          }}
        />
      </div>
    </div>
  );
}
