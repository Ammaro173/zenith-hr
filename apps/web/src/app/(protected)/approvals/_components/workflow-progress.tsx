"use client";

import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const WORKFLOW_STEPS = [
  { key: "PENDING_MANAGER", label: "Direct Manager" },
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
      case "PENDING_HR":
        return 1;
      case "PENDING_FINANCE":
        return 2;
      case "PENDING_CEO":
        return 3;
      case "APPROVED":
      case "COMPLETED":
        return 4;
      case "REJECTED":
        return -2; // Special case for rejected
      default:
        return -1;
    }
  };

  const currentStep = getStepIndex(currentStatus);

  if (currentStatus === "REJECTED") {
    return (
      <div className={cn("py-2 text-center", className)}>
        <span className="font-medium text-destructive">Request Rejected</span>
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
    <div className={cn("flex items-center justify-between", className)}>
      {WORKFLOW_STEPS.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isPending = index > currentStep;

        return (
          <div className="flex items-center" key={step.key}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
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
              <span
                className={cn(
                  "mt-1 font-medium text-xs",
                  isCompleted && "text-primary",
                  isCurrent && "text-primary",
                  isPending && "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {index < WORKFLOW_STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 w-8 transition-colors",
                  index < currentStep ? "bg-primary" : "bg-muted",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
