"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Banknote, Calendar, Check, Hotel, MapPin, X } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { BusinessTrip } from "@/types/business-trips";
import { STATUS_VARIANTS } from "@/types/business-trips";
import { orpc } from "@/utils/orpc";
import { ApprovalActionDialog } from "../approval-action-dialog";

export type TripWithRequester = BusinessTrip & {
  requester?: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
};

interface TripInboxDetailViewProps {
  trip: TripWithRequester;
  onActionComplete: () => void;
}

export function TripInboxDetailView({
  trip,
  onActionComplete,
}: TripInboxDetailViewProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [comment, setComment] = useState("");

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
  }, [transitionTrip, trip.id]);

  const openRejectDialog = useCallback(() => {
    setComment("");
    setDialogOpen(true);
  }, []);

  const confirmReject = useCallback(async () => {
    await transitionTrip({
      tripId: trip.id,
      action: "REJECT",
      comment: comment.trim() || undefined,
    });
    setDialogOpen(false);
  }, [trip.id, comment, transitionTrip]);

  const status = STATUS_VARIANTS[trip.status] || {
    variant: "secondary" as const,
    label: trip.status,
  };

  const purposeLabel = trip.purposeType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  return (
    <>
      <ApprovalActionDialog
        comment={comment}
        confirmLabel="Reject"
        confirmVariant="destructive"
        description="This will notify the requester and update the trip status."
        isPending={isPending}
        onCommentChange={setComment}
        onConfirm={confirmReject}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        requireComment={false}
        title="Reject trip"
      />

      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-xl tracking-tight">
                  {trip.city}, {trip.country}
                </h2>
                <Badge
                  appearance="light"
                  className="font-semibold shadow-none"
                  variant={status.variant}
                >
                  {status.label}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">{purposeLabel}</p>
            </div>
          </div>
          {trip.requester ? (
            <div className="mt-4 flex items-center gap-3">
              <Avatar className="h-8 w-8 border">
                <AvatarImage src={trip.requester.image || ""} />
                <AvatarFallback className="text-xs">
                  {trip.requester.name?.substring(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{trip.requester.name}</p>
                <p className="text-muted-foreground text-xs">
                  {trip.requester.email}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 p-6">
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
                    ? `${Number(trip.estimatedCost).toLocaleString()} ${trip.currency || "USD"}`
                    : undefined
                }
              />
              <DetailField
                label="Per Diem"
                value={
                  trip.perDiemAllowance
                    ? `${Number(trip.perDiemAllowance).toLocaleString()} ${trip.currency || "USD"}`
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
        </div>

        <Separator />
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-card p-4">
          <Button
            disabled={isPending}
            onClick={openRejectDialog}
            size="sm"
            variant="destructive"
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            Reject
          </Button>
          <Button disabled={isPending} onClick={approve} size="sm">
            <Check className="mr-1.5 h-3.5 w-3.5" />
            Approve
          </Button>
        </div>
      </div>
    </>
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
