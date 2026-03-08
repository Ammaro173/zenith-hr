"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Banknote,
  Calendar,
  Check,
  ExternalLink,
  Hotel,
  MapPin,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BusinessTrip } from "@/types/business-trips";
import { STATUS_VARIANTS, TRIP_STEP_LABELS } from "@/types/business-trips";
import { orpc } from "@/utils/orpc";
import { ApprovalActionDialog } from "../approval-action-dialog";
import { WorkflowProgress } from "../workflow-progress";
import { ApprovalDetailActionFooter } from "./approval-detail-action-footer";

export type TripWithRequester = BusinessTrip & {
  requester?: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
};

type DialogAction = "REJECT" | "REQUEST_CHANGE";

interface TripInboxDetailViewProps {
  onActionComplete: () => void;
  trip: TripWithRequester;
}

export function TripInboxDetailView({
  trip,
  onActionComplete,
}: TripInboxDetailViewProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<DialogAction | null>(null);
  const [comment, setComment] = useState("");

  // Fetch approval history for this trip
  const { data: approvalHistory } = useQuery(
    orpc.businessTrips.getApprovalHistory.queryOptions({
      input: { tripId: trip.id },
    }),
  );

  const { mutateAsync: transitionTrip, isPending } = useMutation(
    orpc.businessTrips.transition.mutationOptions({
      onSuccess: () => {
        toast.success("Trip updated");
        queryClient.invalidateQueries({
          queryKey: orpc.businessTrips.getPendingApprovals.key(),
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
    await transitionTrip({ tripId: trip.id, action: "APPROVE" });
  }, [trip.id, transitionTrip]);

  const openDialog = useCallback((action: DialogAction) => {
    setDialogAction(action);
    setComment("");
    setDialogOpen(true);
  }, []);

  const confirmDialogAction = useCallback(async () => {
    if (!dialogAction) {
      return;
    }

    await transitionTrip({
      tripId: trip.id,
      action: dialogAction,
      comment: comment.trim() || undefined,
    });
    setDialogOpen(false);
  }, [comment, dialogAction, trip.id, transitionTrip]);

  const status = STATUS_VARIANTS[trip.status] || {
    variant: "secondary" as const,
    label: trip.status,
  };

  const purposeLabel = trip.purposeType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  let dialogConfirmLabel = "Confirm";
  let dialogTitle = "Update trip";

  if (dialogAction === "REQUEST_CHANGE") {
    dialogConfirmLabel = "Request change";
    dialogTitle = "Request trip changes";
  } else if (dialogAction === "REJECT") {
    dialogConfirmLabel = "Reject";
    dialogTitle = "Reject trip";
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ApprovalActionDialog
        comment={comment}
        confirmLabel={dialogConfirmLabel}
        confirmVariant={dialogAction === "REJECT" ? "destructive" : "default"}
        description="This will notify the requester and update the trip status."
        isPending={isPending}
        onCommentChange={setComment}
        onConfirm={confirmDialogAction}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        requireComment={
          dialogAction === "REJECT" || dialogAction === "REQUEST_CHANGE"
        }
        title={dialogTitle}
      />

      {/* Header */}
      <div className="shrink-0 border-b bg-card px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="truncate font-semibold text-xl tracking-tight">
                {trip.city}, {trip.country}
              </h2>
              <Badge
                appearance="light"
                className="shrink-0 font-semibold shadow-none"
                variant={status.variant}
              >
                {status.label}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">{purposeLabel}</p>
          </div>
          <Button asChild className="shrink-0" size="sm" variant="outline">
            <Link href={`/business-trips/${trip.id}`}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Full Details
            </Link>
          </Button>
        </div>
        {trip.requester ? (
          <div className="mt-3 flex items-center gap-3">
            <Avatar className="h-7 w-7 border">
              <AvatarImage src={trip.requester.image || ""} />
              <AvatarFallback className="text-[10px]">
                {trip.requester.name?.substring(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="leading-tight">
              <p className="font-medium text-sm">{trip.requester.name}</p>
              <p className="text-muted-foreground text-xs">
                {trip.requester.email}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Scrollable Body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-5 p-6">
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Trip Details
            </h3>
            <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-4 text-sm">
              <DetailField
                label="Destination"
                value={`${trip.city}, ${trip.country}`}
              />
              <DetailField label="Purpose" value={purposeLabel} />
              <DetailField
                label="Start Date"
                value={format(new Date(trip.startDate), "dd MMM yyyy")}
              />
              <DetailField
                label="End Date"
                value={format(new Date(trip.endDate), "dd MMM yyyy")}
              />
              <DetailField
                label="Visa Required"
                value={trip.visaRequired ? "Yes" : "No"}
              />
            </div>
          </section>

          {trip.purposeDetails ? (
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 font-medium text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Purpose Details
              </h3>
              <p className="rounded-lg border bg-muted/30 p-4 text-muted-foreground text-sm leading-relaxed">
                {trip.purposeDetails}
              </p>
            </section>
          ) : null}

          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <Banknote className="h-4 w-4 text-muted-foreground" />
              Cost Estimate
            </h3>
            <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-4 text-sm">
              <DetailField
                label="Estimated Cost"
                value={
                  trip.estimatedCost
                    ? `${Number(trip.estimatedCost).toLocaleString()} ${trip.currency || "QAR"}`
                    : undefined
                }
              />
              <DetailField
                label="Per Diem"
                value={
                  trip.perDiemAllowance
                    ? `${Number(trip.perDiemAllowance).toLocaleString()} ${trip.currency || "QAR"}`
                    : undefined
                }
              />
            </div>
          </section>

          {trip.needsFlightBooking || trip.needsHotelBooking ? (
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 font-medium text-sm">
                <Hotel className="h-4 w-4 text-muted-foreground" />
                Travel & Accommodation
              </h3>
              <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-4 text-sm">
                <DetailField
                  label="Flight Booking"
                  value={trip.needsFlightBooking ? "Requested" : "Not needed"}
                />
                <DetailField
                  label="Hotel Booking"
                  value={trip.needsHotelBooking ? "Requested" : "Not needed"}
                />
                {trip.departureCity ? (
                  <DetailField label="From" value={trip.departureCity} />
                ) : null}
                {trip.arrivalCity ? (
                  <DetailField label="To" value={trip.arrivalCity} />
                ) : null}
                {trip.travelClass ? (
                  <DetailField label="Class" value={trip.travelClass} />
                ) : null}
              </div>
              {trip.flightNotes ? (
                <p className="rounded-lg border bg-muted/30 p-4 text-muted-foreground text-sm">
                  {trip.flightNotes}
                </p>
              ) : null}
            </section>
          ) : null}

          {/* Approval Workflow Progress */}
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <Check className="h-4 w-4 text-muted-foreground" />
              Approval Workflow
            </h3>
            <div className="rounded-lg border bg-muted/30 p-4">
              <WorkflowProgress currentStatus={trip.status} />
            </div>
          </section>

          {/* Approval History */}
          {approvalHistory && approvalHistory.length > 0 ? (
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 font-medium text-sm">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Approval History
              </h3>
              <div className="space-y-3">
                {approvalHistory.map((log) => (
                  <div
                    className="rounded-lg border bg-muted/30 p-4 text-sm"
                    key={log.id}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          className="text-xs"
                          variant={getActionBadgeVariant(log.action)}
                        >
                          {log.action}
                        </Badge>
                        <span className="font-medium">
                          {log.actor?.name || "Unknown"}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {format(
                          new Date(log.performedAt),
                          "dd MMM yyyy, HH:mm",
                        )}
                      </span>
                    </div>
                    {log.stepName ? (
                      <p className="mt-1 text-muted-foreground text-xs">
                        Step: {TRIP_STEP_LABELS[log.stepName] ?? log.stepName}
                      </p>
                    ) : null}
                    {log.comment ? (
                      <div className="mt-2 rounded bg-background p-2 text-sm">
                        <p className="mb-1 text-muted-foreground text-xs">
                          {log.action === "REJECT"
                            ? "Rejection Reason:"
                            : "Note:"}
                        </p>
                        <p>{log.comment}</p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Timeline
            </h3>
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <DetailField
                label="Created"
                value={format(new Date(trip.createdAt), "dd MMM yyyy, HH:mm")}
              />
            </div>
          </section>

          <p className="pb-2 text-center text-muted-foreground text-xs">
            Submitted{" "}
            {format(new Date(trip.createdAt), "dd MMM yyyy 'at' HH:mm")}
          </p>
        </div>
      </div>

      <ApprovalDetailActionFooter
        disabled={isPending}
        onApprove={approve}
        onReject={() => openDialog("REJECT")}
        onRequestChange={() => openDialog("REQUEST_CHANGE")}
      />
    </div>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | undefined | null;
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 font-medium">{value || "—"}</dd>
    </div>
  );
}

function getActionBadgeVariant(
  action: string,
): "default" | "destructive" | "secondary" {
  switch (action) {
    case "REJECT":
      return "destructive";
    case "APPROVE":
      return "default";
    default:
      return "secondary";
  }
}
