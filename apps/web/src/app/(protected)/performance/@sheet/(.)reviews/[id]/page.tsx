"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PerformanceReviewForm } from "@/features/performance";

export default function InterceptedReviewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(true);
  const employeeId = searchParams.get("employeeId") ?? undefined;
  const isNewProbation = params.id === "new" && !!employeeId;

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      router.back();
    }
  };

  return (
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetContent className="overflow-y-auto p-6 sm:max-w-2xl">
        <SheetHeader className="pb-6">
          <SheetTitle className="font-bold text-2xl">
            Performance Review
          </SheetTitle>
          <SheetDescription>
            Complete the review form below to assess employee performance.
          </SheetDescription>
        </SheetHeader>
        <PerformanceReviewForm
          employeeId={isNewProbation ? employeeId : undefined}
          mode="sheet"
          onCancel={() => {
            setOpen(false);
            router.back();
          }}
          onSuccess={() => {
            setOpen(false);
            router.back();
          }}
          reviewId={isNewProbation ? undefined : params.id}
        />
      </SheetContent>
    </Sheet>
  );
}
