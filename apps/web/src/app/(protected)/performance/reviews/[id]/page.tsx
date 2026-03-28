"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { PerformanceReviewForm } from "@/features/performance";
import { orpc } from "@/utils";
import { EmployeeSidebar } from "./_components/employee-sidebar";
import { ReviewHeader } from "./_components/review-header";

export default function ReviewDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const employeeId = searchParams.get("employeeId") ?? undefined;
  const isNewProbation = params.id === "new" && !!employeeId;

  const { data: review, isLoading } = useQuery({
    ...orpc.performance.getReview.queryOptions({
      input: { reviewId: params.id },
    }),
    enabled: !isNewProbation,
  });

  if (isNewProbation) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">
            Create Probation Review
          </h1>
          <p className="text-muted-foreground">
            Fill in the review details, then save draft or submit.
          </p>
        </div>
        <PerformanceReviewForm employeeId={employeeId} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <h2 className="font-semibold text-2xl">Review Not Found</h2>
        <p className="text-muted-foreground">
          The performance review you're looking for doesn't exist.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <ReviewHeader review={review} />

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Employee Sidebar */}
        <aside className="hidden w-72 shrink-0 lg:block">
          <EmployeeSidebar employee={review.employee} />
        </aside>

        {/* Review Form */}
        <main className="flex-1">
          <PerformanceReviewForm reviewId={params.id} />
        </main>
      </div>
    </div>
  );
}
