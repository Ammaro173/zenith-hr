"use client";

import { Check, Circle } from "lucide-react";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

const WORKFLOW_STEPS = [
  { key: "PENDING_MANAGER", label: "Direct Manager" },
  { key: "PENDING_HOD", label: "HOD" },
  { key: "PENDING_HR", label: "Head of HR" },
  { key: "PENDING_FINANCE", label: "Head of Finance" },
  { key: "PENDING_CEO", label: "CEO" },
  { key: "APPROVED", label: "Approved" },
];

interface WorkflowProgressProps {
  className?: string;
  currentStatus: string;
}

export function WorkflowProgress({
  currentStatus,
  className,
}: WorkflowProgressProps) {
  // Map status to step index
  const getStepIndex = (status: string): number => {
    switch (status) {
      case "DRAFT":
        return -1;
      case "PENDING_MANAGER":
        return 0;
      case "PENDING_HOD":
        return 1;
      case "PENDING_HR":
        return 2;
      case "PENDING_FINANCE":
        return 3;
      case "PENDING_CEO":
        return 4;
      case "CHANGE_REQUESTED":
        return -3;
      case "APPROVED":
      case "COMPLETED":
        return 5;
      case "REJECTED":
        return -2; // Special case for rejected
      default:
        return -1;
    }
  };

  const currentStep = getStepIndex(currentStatus);
  const isTerminalApproved =
    currentStatus === "APPROVED" || currentStatus === "COMPLETED";
  const effectiveStep = isTerminalApproved ? currentStep + 1 : currentStep;

  if (currentStatus === "REJECTED") {
    return (
      <div className={cn("py-2 text-center", className)}>
        <span className="font-medium text-destructive">Request Rejected</span>
      </div>
    );
  }

  if (currentStatus === "CHANGE_REQUESTED") {
    return (
      <div className={cn("py-2 text-center", className)}>
        <span className="font-medium text-amber-600">Changes Requested</span>
      </div>
    );
  }

  if (currentStatus === "CANCELLED") {
    return (
      <div className={cn("py-2 text-center", className)}>
        <span className="font-medium text-muted-foreground">
          Request Cancelled
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4 2xl:flex-row 2xl:items-start",
        className,
      )}
    >
      {WORKFLOW_STEPS.map((step, index) => {
        const isCompleted = index < effectiveStep;
        const isCurrent = index === effectiveStep;
        const isPending = index > effectiveStep;

        return (
          <Fragment key={step.key}>
            <div className="flex min-w-0 items-start gap-3 2xl:flex-1 2xl:flex-col 2xl:items-center 2xl:text-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    isCompleted &&
                      "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary bg-background text-primary",
                    isPending &&
                      "border-muted bg-background text-muted-foreground",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </div>
                {index < WORKFLOW_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "mt-2 h-8 w-0.5 shrink-0 2xl:hidden",
                      isCompleted ? "bg-primary" : "bg-muted",
                    )}
                  />
                )}
              </div>
              <div className="min-w-0 space-y-1 pt-1 2xl:flex 2xl:min-h-12 2xl:flex-col 2xl:items-center 2xl:justify-start 2xl:pt-0">
                <span
                  className={cn(
                    "block text-left font-medium text-xs leading-tight 2xl:text-center",
                    isCompleted && "text-primary",
                    isCurrent && "text-primary",
                    isPending && "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
            </div>
            {index < WORKFLOW_STEPS.length - 1 && (
              <div
                className={cn(
                  "hidden h-0.5 flex-1 2xl:mt-4 2xl:block",
                  isCompleted ? "bg-primary" : "bg-muted",
                )}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
