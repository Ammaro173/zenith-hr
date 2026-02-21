"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Banknote,
  Briefcase,
  Check,
  ExternalLink,
  FileText,
  RotateCcw,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ManpowerRequest } from "@/types/requests";
import { STATUS_VARIANTS } from "@/types/requests";
import { orpc } from "@/utils/orpc";
import { ApprovalActionDialog } from "../approval-action-dialog";

type DialogAction = "REJECT" | "REQUEST_CHANGE";

interface RequestInboxDetailViewProps {
  request: ManpowerRequest;
  onActionComplete: () => void;
}

export function RequestInboxDetailView({
  request,
  onActionComplete,
}: RequestInboxDetailViewProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<DialogAction | null>(null);
  const [comment, setComment] = useState("");

  const { mutateAsync: transitionRequest, isPending } = useMutation(
    orpc.requests.transition.mutationOptions({
      onSuccess: () => {
        toast.success("Request updated");
        queryClient.invalidateQueries({
          queryKey: orpc.requests.getPendingApprovals.key(),
        });
        queryClient.invalidateQueries({
          queryKey: orpc.dashboard.getActionsRequired.key(),
        });
        onActionComplete();
      },
      onError: (error) => {
        toast.error(error.message || "Action failed");
      },
    }),
  );

  const approve = useCallback(async () => {
    await transitionRequest({ requestId: request.id, action: "APPROVE" });
  }, [transitionRequest, request.id]);

  const openDialog = useCallback((action: DialogAction) => {
    setDialogAction(action);
    setComment("");
    setDialogOpen(true);
  }, []);

  const confirmDialogAction = useCallback(async () => {
    if (!dialogAction) {
      return;
    }
    await transitionRequest({
      requestId: request.id,
      action: dialogAction,
      comment: comment.trim() || undefined,
    });
    setDialogOpen(false);
  }, [dialogAction, request.id, comment, transitionRequest]);

  const status = STATUS_VARIANTS[request.status] || {
    variant: "secondary" as const,
    label: request.status,
  };
  const position = request.positionDetails;
  const jd = request.jobDescription;
  const reportingLabel = request.reportingPosition
    ? `${request.reportingPosition.name} (${request.reportingPosition.code})`
    : position?.reportingTo || null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ApprovalActionDialog
        comment={comment}
        confirmLabel={
          dialogAction === "REQUEST_CHANGE" ? "Request change" : "Reject"
        }
        confirmVariant={dialogAction === "REJECT" ? "destructive" : "default"}
        description="This will notify the requester and update the workflow state."
        isPending={isPending}
        onCommentChange={setComment}
        onConfirm={confirmDialogAction}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        requireComment={dialogAction === "REQUEST_CHANGE"}
        title={
          dialogAction === "REQUEST_CHANGE"
            ? "Request changes"
            : "Reject request"
        }
      />

      {/* Header */}
      <div className="shrink-0 border-b bg-card px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="truncate font-semibold text-xl tracking-tight">
                {jd?.title || position?.title || "Manpower Request"}
              </h2>
              <Badge
                appearance="light"
                className="shrink-0 font-semibold shadow-none"
                variant={status.variant}
              >
                {status.label}
              </Badge>
            </div>
            <p className="font-mono text-muted-foreground text-sm">
              {request.requestCode}
            </p>
          </div>
          <Button asChild className="shrink-0" size="sm" variant="outline">
            <Link href={`/requests/${request.id}`}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Full Details
            </Link>
          </Button>
        </div>
        {request.requester ? (
          <div className="mt-3 flex items-center gap-3">
            <Avatar className="h-7 w-7 border">
              <AvatarImage src={request.requester.image || ""} />
              <AvatarFallback className="text-[10px]">
                {request.requester.name?.substring(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="leading-tight">
              <p className="font-medium text-sm">{request.requester.name}</p>
              <p className="text-muted-foreground text-xs">
                {request.requester.email}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Scrollable Body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-5 p-6">
          {/* Position Details */}
          <section>
            <SectionHeader icon={Briefcase} title="Position Details" />
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border bg-muted/30 p-4 text-sm">
              <DetailField
                label="Department"
                value={jd?.departmentName ?? position?.department}
              />
              <DetailField label="Location" value={position?.location} />
              <DetailField
                label="Request Type"
                value={formatLabel(request.requestType)}
              />
              <DetailField
                label="Headcount"
                value={String(request.headcount ?? 1)}
              />
              <DetailField
                label="Employment Type"
                value={formatLabel(request.employmentType ?? "")}
              />
              <DetailField
                label="Contract"
                value={formatLabel(request.contractDuration ?? "")}
              />
              {jd?.assignedRole ? (
                <DetailField
                  label="Assigned Role"
                  value={formatLabel(jd.assignedRole)}
                />
              ) : null}
              {jd?.grade ? (
                <DetailField label="Grade" value={jd.grade} />
              ) : null}
              {position?.startDate ? (
                <DetailField
                  label="Start Date"
                  value={format(new Date(position.startDate), "dd MMM yyyy")}
                />
              ) : null}
              {reportingLabel ? (
                <DetailField
                  label="Reports To"
                  subValue={
                    request.reportingPosition?.incumbentName
                      ? `Incumbent: ${request.reportingPosition.incumbentName}`
                      : undefined
                  }
                  value={reportingLabel}
                />
              ) : null}
              {request.requestType === "REPLACEMENT" &&
              request.replacementForUser ? (
                <DetailField
                  label="Replacing"
                  value={request.replacementForUser.name}
                />
              ) : null}
            </div>
          </section>

          {/* Budget */}
          <section>
            <SectionHeader icon={Banknote} title="Budget" />
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border bg-muted/30 p-4 text-sm">
              <DetailField
                label="Salary Range"
                value={`${Number(request.salaryRangeMin ?? 0).toLocaleString()} – ${Number(request.salaryRangeMax ?? 0).toLocaleString()}`}
              />
              <DetailField
                label="Employment Type"
                value={formatLabel(request.employmentType ?? "")}
              />
            </div>
          </section>

          {/* Description & Responsibilities */}
          {jd?.description || position?.description || jd?.responsibilities ? (
            <section>
              <SectionHeader icon={FileText} title="Job Details" />
              <div className="mt-2 space-y-3 rounded-lg border bg-muted/30 p-4">
                {jd?.description || position?.description ? (
                  <div>
                    <p className="mb-1 font-medium text-muted-foreground text-xs">
                      Description
                    </p>
                    <p className="text-sm leading-relaxed">
                      {jd?.description || position?.description}
                    </p>
                  </div>
                ) : null}
                {jd?.description && jd?.responsibilities ? <Separator /> : null}
                {jd?.responsibilities ? (
                  <div>
                    <p className="mb-1 font-medium text-muted-foreground text-xs">
                      Responsibilities
                    </p>
                    <p className="text-sm leading-relaxed">
                      {jd.responsibilities}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {/* Justification */}
          {request.justificationText ? (
            <section>
              <SectionHeader icon={FileText} title="Justification" />
              <p className="mt-2 rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed">
                {request.justificationText}
              </p>
            </section>
          ) : null}

          {/* Replacement (standalone only if not already shown in position grid) */}
          {request.requestType !== "REPLACEMENT" &&
          request.replacementForUser ? (
            <section>
              <SectionHeader icon={Users} title="Replacing" />
              <p className="mt-2 rounded-lg border bg-muted/30 p-4 text-sm">
                {request.replacementForUser.name}
              </p>
            </section>
          ) : null}

          {/* Submitted date as subtle footer info */}
          <p className="pb-2 text-center text-muted-foreground text-xs">
            Submitted{" "}
            {format(new Date(request.createdAt), "dd MMM yyyy 'at' HH:mm")}
          </p>
        </div>
      </div>

      {/* Fixed Action Footer */}
      <div className="shrink-0 border-t bg-card px-6 py-3">
        <div className="flex items-center justify-end gap-3">
          <Button
            disabled={isPending}
            onClick={() => openDialog("REQUEST_CHANGE")}
            size="sm"
            variant="outline"
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Request Change
          </Button>
          <Button
            disabled={isPending}
            onClick={() => openDialog("REJECT")}
            size="sm"
            variant="destructive"
          >
            <X className="mr-2 h-3.5 w-3.5" />
            Reject
          </Button>
          <Button disabled={isPending} onClick={approve} size="sm">
            <Check className="mr-2 h-3.5 w-3.5" />
            Approve
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <h3 className="flex items-center gap-2 font-medium text-sm">
      <Icon className="h-4 w-4 text-muted-foreground" />
      {title}
    </h3>
  );
}

function DetailField({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string | undefined | null;
  subValue?: string;
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 font-medium">{value || "—"}</dd>
      {subValue ? (
        <dd className="mt-0.5 text-[11px] text-muted-foreground">{subValue}</dd>
      ) : null}
    </div>
  );
}

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
