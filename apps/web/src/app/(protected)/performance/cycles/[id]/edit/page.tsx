"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { CycleForm } from "@/features/performance";
import { orpc } from "@/utils/orpc";

export default function EditCyclePage() {
  const params = useParams<{ id: string }>();
  const { data: cycle, isLoading } = useQuery(
    orpc.performance.getCycle.queryOptions({ input: { id: params.id } }),
  );

  if (isLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!cycle) {
    return <div>Cycle not found</div>;
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="mb-6 font-bold text-2xl">Edit Performance Cycle</h1>
      <CycleForm
        cycleId={cycle.id}
        initialValues={{
          name: cycle.name,
          description: cycle.description || "",
          startDate: new Date(cycle.startDate),
          endDate: new Date(cycle.endDate),
          status: cycle.status as "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED",
        }}
      />
    </div>
  );
}
