"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  History,
  Info,
  Loader2,
  MapPin,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { client, orpc } from "@/utils/orpc";

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [comment, setComment] = useState("");

  const { data: request, isLoading: isRequestLoading } = useQuery(
    orpc.requests.getById.queryOptions({ input: { id: params.id } }),
  );

  const { data: history } = useQuery(
    orpc.workflow.getRequestHistory.queryOptions({ input: { id: params.id } }),
  );

  const transitionMutation = useMutation({
    mutationFn: (action: "APPROVE" | "REJECT" | "REQUEST_CHANGE" | "HOLD") =>
      client.requests.transition({
        requestId: params.id,
        action,
        comment,
      }),
    onSuccess: (data) => {
      toast.success(
        `Request ${data.newStatus.toLowerCase().replace("_", " ")}`,
      );
      setComment("");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Action failed");
    },
  });

  if (isRequestLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Request not found</p>
        <Button asChild variant="outline">
          <Link href="/requests">Go back</Link>
        </Button>
      </div>
    );
  }

  const isApprover =
    request.currentApproverId === session?.user?.id &&
    !["APPROVED_OPEN", "REJECTED", "ARCHIVED", "DRAFT"].includes(
      request.status,
    );

  const positionDetails = request.positionDetails as {
    title: string;
    department: string;
    location?: string;
    startDate?: string;
    reportingTo?: string;
  };
  const budgetDetails = request.budgetDetails as {
    currency: string;
    costCenter?: string;
    budgetCode?: string;
  };

  return (
    <div className="container max-w-6xl space-y-8 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button asChild className="-ml-2" size="icon" variant="ghost">
              <Link href="/requests">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <Badge className="text-[10px] uppercase" variant="outline">
              {request.requestCode}
            </Badge>
            <Badge
              className={cn(
                "text-[10px] uppercase",
                request.status === "APPROVED_OPEN" && "bg-green-500",
                request.status === "REJECTED" && "bg-destructive",
                request.status.startsWith("PENDING") && "bg-orange-500",
              )}
            >
              {request.status.replace("_", " ")}
            </Badge>
          </div>
          <h1 className="font-bold text-3xl tracking-tight">
            {positionDetails.title}
          </h1>
          <div className="flex items-center gap-4 text-muted-foreground text-sm">
            <span>{positionDetails.department} Department</span>
            <span>•</span>
            <span>
              Submitted {format(new Date(request.createdAt), "MMM d, yyyy")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Requester
            </span>
            <span className="font-semibold">
              {request.requester?.name || "Unknown"}
            </span>
          </div>
          <Avatar className="size-10">
            <AvatarImage src={request.requester?.image ?? undefined} />
            <AvatarFallback>
              <User className="size-6 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Position Details Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 pb-4">
              <CardTitle className="font-bold text-base">
                Position Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-y-6 pt-6 md:grid-cols-2">
              <DetailItem
                label="DEPARTMENT"
                value={positionDetails.department}
              />
              <DetailItem
                label="EMPLOYMENT TYPE"
                value={request.contractDuration.replace("_", " ")}
              />
              <DetailItem
                icon={<MapPin className="size-3" />}
                label="LOCATION"
                value={positionDetails.location || "Not specified"}
              />
              <DetailItem
                icon={<Calendar className="size-3" />}
                label="START DATE"
                value={
                  positionDetails.startDate
                    ? format(new Date(positionDetails.startDate), "MMM d, yyyy")
                    : "Not specified"
                }
              />
              <DetailItem
                label="REPLACEMENT FOR"
                value={
                  request.requestType === "REPLACEMENT"
                    ? request.replacementForUser?.name || "Existing Employee"
                    : "New Position (Growth)"
                }
              />
              <DetailItem
                label="REPORTING TO"
                value={positionDetails.reportingTo || "Not specified"}
              />

              <div className="space-y-2 md:col-span-2">
                <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                  JUSTIFICATION
                </span>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {request.justificationText}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Budget & Financials */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 pb-4">
              <CardTitle className="font-bold text-base">
                Budget & Financials
              </CardTitle>
              {request.isBudgeted && (
                <Badge
                  className="border-green-200 bg-green-50 text-green-700"
                  variant="outline"
                >
                  WITHIN BUDGET
                </Badge>
              )}
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 pt-6 md:grid-cols-3">
              <div className="space-y-1">
                <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                  SALARY RANGE
                </span>
                <div className="font-semibold">
                  {Number(request.salaryRangeMin).toLocaleString()} -{" "}
                  {Number(request.salaryRangeMax).toLocaleString()}{" "}
                  {budgetDetails.currency}
                </div>
              </div>
              <DetailItem
                label="COST CENTER"
                value={budgetDetails.costCenter || "Not specified"}
              />
              <DetailItem
                label="BUDGET CODE"
                value={budgetDetails.budgetCode || "Not specified"}
              />
            </CardContent>
          </Card>

          {/* Activity Log */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <History className="size-4 text-muted-foreground" />
              <h3 className="font-bold">Activity Log</h3>
            </div>
            <div className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-4 before:w-0.5 before:bg-muted">
              {history?.map((log) => (
                <div className="relative pl-10" key={log.id}>
                  <div className="absolute top-1.5 left-2.5 size-3 rounded-full border-2 border-primary bg-background ring-4 ring-background" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {log.actor?.name || "System"}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {log.stepName} •{" "}
                        {format(new Date(log.performedAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                    {log.comment && (
                      <div className="rounded-lg border bg-muted/50 p-3 text-muted-foreground text-sm italic">
                        "{log.comment}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {!history?.length && (
                <div className="pl-10 text-muted-foreground text-sm italic">
                  No activity logs yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Action Panel */}
          {isApprover && (
            <Card className="border-primary/20 shadow-lg shadow-primary/5">
              <CardHeader className="bg-primary/5 pb-4">
                <CardTitle className="font-bold text-base">
                  Pending Your Action
                </CardTitle>
                <p className="text-muted-foreground text-xs">
                  As {request.currentApproverRole} Approver, please review the
                  budget impact.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-wider">
                    COMMENTS
                  </Label>
                  <Textarea
                    className="min-h-[100px] resize-none"
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a note..."
                    value={comment}
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    className="w-full bg-black text-white hover:bg-black/90"
                    disabled={transitionMutation.isPending}
                    onClick={() => transitionMutation.mutate("APPROVE")}
                  >
                    {transitionMutation.isPending ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    Approve Request
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      className="w-full"
                      disabled={transitionMutation.isPending}
                      onClick={() =>
                        transitionMutation.mutate("REQUEST_CHANGE")
                      }
                      variant="outline"
                    >
                      Revise
                    </Button>
                    <Button
                      className="w-full text-destructive hover:bg-destructive/5"
                      disabled={transitionMutation.isPending}
                      onClick={() => transitionMutation.mutate("REJECT")}
                      variant="outline"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Approval Chain */}
          <Card>
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="font-bold text-sm uppercase tracking-wider">
                  Approval Chain
                </CardTitle>
                <Badge className="text-[10px]" variant="secondary">
                  STEP {getStepNumber(request.status)} OF 5
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="relative space-y-8 before:absolute before:top-2 before:bottom-2 before:left-3 before:w-px before:bg-muted">
                <ChainStep
                  actor={request.requester?.name}
                  label="Requester"
                  status="COMPLETED"
                />
                <ChainStep
                  isActive={request.status === "PENDING_MANAGER"}
                  label="Line Manager"
                  status={getChainStepStatus(request.status, "PENDING_MANAGER")}
                />
                <ChainStep
                  isActive={request.status === "PENDING_HR"}
                  label="HR"
                  status={getChainStepStatus(request.status, "PENDING_HR")}
                />
                <ChainStep
                  isActive={request.status === "PENDING_FINANCE"}
                  label="Finance"
                  status={getChainStepStatus(request.status, "PENDING_FINANCE")}
                />
                <ChainStep
                  isActive={request.status === "PENDING_CEO"}
                  label="CEO"
                  status={getChainStepStatus(request.status, "PENDING_CEO")}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed bg-muted/30">
            <CardContent className="flex gap-3 pt-6">
              <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="space-y-1">
                <p className="font-bold text-xs uppercase tracking-wider">
                  Policy Reminder
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Positions above QAR 20k require explicit justification for
                  budget allocation if not previously forecasted.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function getChainStepStatus(
  currentStatus: string,
  stepStatus: string,
): "COMPLETED" | "PENDING" | "WAITING" {
  const statuses = [
    "DRAFT",
    "PENDING_MANAGER",
    "PENDING_HR",
    "PENDING_FINANCE",
    "PENDING_CEO",
    "APPROVED_OPEN",
  ];
  const currentIndex = statuses.indexOf(currentStatus);
  const stepIndex = statuses.indexOf(stepStatus);

  if (currentIndex > stepIndex) {
    return "COMPLETED";
  }
  if (currentIndex === stepIndex) {
    return "PENDING";
  }
  return "WAITING";
}

function getStepNumber(status: string): number {
  const mapping: Record<string, number> = {
    DRAFT: 1,
    PENDING_MANAGER: 2,
    PENDING_HR: 3,
    PENDING_FINANCE: 4,
    PENDING_CEO: 5,
    APPROVED_OPEN: 5,
  };
  return mapping[status] || 1;
}

function DetailItem({
  label,
  value,
  subValue,
  icon,
}: {
  label: string;
  value: string;
  subValue?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-semibold text-sm">{value}</span>
      </div>
      {subValue && (
        <div className="text-[10px] text-muted-foreground">{subValue}</div>
      )}
    </div>
  );
}

function ChainStep({
  label,
  actor,
  status,
  isActive,
}: {
  label: string;
  actor?: string;
  status: "COMPLETED" | "PENDING" | "WAITING";
  isActive?: boolean;
}) {
  return (
    <div className="relative pl-8">
      <div
        className={cn(
          "absolute top-1 left-1.5 z-10 size-3 rounded-full ring-4 ring-background",
          status === "COMPLETED"
            ? "bg-black"
            : "border border-muted-foreground bg-muted",
          isActive && "animate-pulse border-primary bg-primary ring-primary/20",
        )}
      >
        {status === "COMPLETED" && (
          <CheckCircle2 className="absolute -top-px -left-px size-3 text-white" />
        )}
      </div>
      <div className="space-y-0.5">
        <div
          className={cn(
            "font-bold text-xs uppercase tracking-wider",
            isActive ? "text-primary" : "text-foreground",
          )}
        >
          {label}
        </div>
        {actor ? (
          <div className="text-muted-foreground text-xs">{actor}</div>
        ) : (
          <div className="text-muted-foreground text-xs italic">
            {status === "WAITING" ? "Final Approval" : "Pending Approval"}
          </div>
        )}
      </div>
    </div>
  );
}
