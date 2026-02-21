"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Banknote,
  Briefcase,
  Calendar,
  Check,
  FileText,
  MapPin,
  RotateCcw,
  ScrollText,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <div className="shrink-0 border-b bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-xl tracking-tight">
                {jd?.title || position?.title || "Manpower Request"}
              </h2>
              <Badge
                appearance="light"
                className="font-semibold shadow-none"
                variant={status.variant}
              >
                {status.label}
              </Badge>
            </div>
            <p className="font-mono text-muted-foreground text-sm">
              {request.requestCode}
            </p>
          </div>
        </div>
        {request.requester ? (
          <div className="mt-4 flex items-center gap-3">
            <Avatar className="h-8 w-8 border">
              <AvatarImage src={request.requester.image || ""} />
              <AvatarFallback className="text-xs">
                {request.requester.name?.substring(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{request.requester.name}</p>
              <p className="text-muted-foreground text-xs">
                {request.requester.email}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
        {/* Position Details */}
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 font-medium text-sm">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            Position Details
          </h3>
          <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-4 text-sm">
            <DetailField
              label="Department"
              value={jd?.departmentName ?? position?.department}
            />
            <DetailField
              label="Location"
              icon={<MapPin className="h-3 w-3 text-muted-foreground" />}
              value={position?.location}
            />
            <DetailField
              label="Request Type"
              value={formatLabel(request.requestType)}
            />
            <DetailField
              label="Employment Type"
              value={formatLabel(request.employmentType ?? "")}
            />
            <DetailField
              label="Contract"
              value={formatLabel(request.contractDuration ?? "")}
            />
            <DetailField
              label="Headcount"
              value={String(request.headcount ?? 1)}
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
                icon={<Calendar className="h-3 w-3 text-muted-foreground" />}
                value={format(new Date(position.startDate), "dd MMM yyyy")}
              />
            ) : null}
            <DetailField
              label="Reports To"
              icon={<UserCheck className="h-3 w-3 text-muted-foreground" />}
              value={
                request.reportingPosition
                  ? `${request.reportingPosition.name} (${request.reportingPosition.code})`
                  : position?.reportingTo || undefined
              }
              subValue={
                request.reportingPosition?.incumbentName
                  ? `Incumbent: ${request.reportingPosition.incumbentName}`
                  : undefined
              }
            />
          </div>
        </section>

        {/* Description */}
        {(jd?.description || position?.description) ? (
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Description
            </h3>
            <p className="rounded-lg border bg-muted/30 p-4 text-muted-foreground text-sm leading-relaxed">
              {jd?.description || position?.description}
            </p>
          </section>
        ) : null}

        {/* Responsibilities */}
        {jd?.responsibilities ? (
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <ScrollText className="h-4 w-4 text-muted-foreground" />
              Responsibilities
            </h3>
            <p className="rounded-lg border bg-muted/30 p-4 text-muted-foreground text-sm leading-relaxed">
              {jd.responsibilities}
            </p>
          </section>
        ) : null}

        {/* Budget */}
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 font-medium text-sm">
            <Banknote className="h-4 w-4 text-muted-foreground" />
            Budget
          </h3>
          <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-4 text-sm">
            <DetailField
              label="Salary Range"
              value={`${Number(request.salaryRangeMin ?? 0).toLocaleString()} – ${Number(request.salaryRangeMax ?? 0).toLocaleString()}`}
            />
            <DetailField
              label="Contract"
              value={formatLabel(request.contractDuration ?? "")}
            />
          </div>
        </section>

        {/* Justification */}
        {request.justificationText ? (
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Justification
            </h3>
            <p className="rounded-lg border bg-muted/30 p-4 text-muted-foreground text-sm leading-relaxed">
              {request.justificationText}
            </p>
          </section>
        ) : null}

        {/* Replacing */}
        {request.replacementForUser ? (
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              Replacing
            </h3>
            <p className="rounded-lg border bg-muted/30 p-4 text-sm">
              {request.replacementForUser.name}
            </p>
          </section>
        ) : null}

        {/* Timeline */}
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 font-medium text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Timeline
          </h3>
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <DetailField
              label="Created"
              value={format(new Date(request.createdAt), "dd MMM yyyy, HH:mm")}
            />
          </div>
        </section>

        {/* Action Buttons */}
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t bg-background/80 p-4 backdrop-blur-sm">
          <Button
            disabled={isPending}
            onClick={() => openDialog("REQUEST_CHANGE")}
            variant="outline"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Request Change
          </Button>
          <Button
            disabled={isPending}
            onClick={() => openDialog("REJECT")}
            variant="destructive"
          >
            <X className="mr-2 h-4 w-4" />
            Reject
          </Button>
          <Button disabled={isPending} onClick={approve}>
            <Check className="mr-2 h-4 w-4" />
            Approve
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
  subValue,
  icon,
}: {
  label: string;
  value: string | undefined | null;
  subValue?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
        {icon}
        {value || "—"}
      </dd>
      {subValue ? (
        <dd className="mt-0.5 text-muted-foreground text-[10px]">
          {subValue}
        </dd>
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
