"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CycleForm } from "@/features/performance";
import { orpc } from "@/utils/orpc";

export default function InterceptedEditCyclePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [open, setOpen] = useState(true);

  const { data: cycle, isLoading } = useQuery(
    orpc.performance.getCycle.queryOptions({ input: { id: params.id } }),
  );

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      router.back();
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <div>Loading...</div>;
    }

    if (!cycle) {
      return <div>Cycle not found</div>;
    }

    return (
      <CycleForm
        cycleId={cycle.id}
        initialValues={{
          name: cycle.name,
          description: cycle.description || "",
          startDate: new Date(cycle.startDate),
          endDate: new Date(cycle.endDate),
          status: cycle.status as "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED",
        }}
        mode="sheet"
        onCancel={() => {
          setOpen(false);
          router.back();
        }}
        onSuccess={() => {
          setOpen(false);
          router.back();
        }}
      />
    );
  };

  return (
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetContent className="overflow-y-auto p-6 sm:max-w-xl">
        <SheetHeader className="pb-6">
          <SheetTitle className="font-bold text-2xl">
            Edit Performance Cycle
          </SheetTitle>
          <SheetDescription>
            Update the performance cycle details.
          </SheetDescription>
        </SheetHeader>

        {renderContent()}
      </SheetContent>
    </Sheet>
  );
}
