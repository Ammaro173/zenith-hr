"use client";

import { useQuery } from "@tanstack/react-query";
import { createTripDefaults } from "@zenith-hr/api/modules/business-trips/business-trips.schema";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BusinessTripForm } from "@/features/business-trips";
import type { FormValues } from "@/features/business-trips/types";
import { orpc } from "@/utils/orpc";

interface EditBusinessTripClientPageProps {
  currentUserId?: string;
}

const EDITABLE_STATUSES = ["DRAFT", "CHANGE_REQUESTED"] as const;

export function EditBusinessTripClientPage({
  currentUserId,
}: EditBusinessTripClientPageProps) {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const { data: trip, isLoading } = useQuery(
    orpc.businessTrips.getById.queryOptions({ input: { id: params.id } }),
  );

  if (isLoading) {
    return (
      <div className="flex h-100 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="container max-w-3xl space-y-4 py-10">
        <p className="text-muted-foreground">Trip not found.</p>
        <Button asChild variant="outline">
          <Link href="/business-trips">Back to trips</Link>
        </Button>
      </div>
    );
  }

  const canEdit =
    trip.requesterId === currentUserId &&
    EDITABLE_STATUSES.includes(
      trip.status as (typeof EDITABLE_STATUSES)[number],
    );

  if (!canEdit) {
    return (
      <div className="container max-w-3xl space-y-6 py-10">
        <div className="space-y-1">
          <h1 className="font-bold text-3xl tracking-tight">
            Edit Business Trip
          </h1>
          <p className="text-muted-foreground">
            Only draft or change-requested trips owned by you can be edited.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/business-trips/${trip.id}`}>
            <ArrowLeft className="mr-2 size-4" />
            Back to trip
          </Link>
        </Button>
      </div>
    );
  }

  const initialValues: FormValues = {
    country: trip.country ?? createTripDefaults.country,
    city: trip.city ?? createTripDefaults.city,
    purposeType:
      (trip.purposeType as FormValues["purposeType"]) ??
      createTripDefaults.purposeType,
    purposeDetails: trip.purposeDetails ?? createTripDefaults.purposeDetails,
    startDate: new Date(trip.startDate),
    endDate: new Date(trip.endDate),
    visaRequired: trip.visaRequired,
    needsFlightBooking: trip.needsFlightBooking,
    needsHotelBooking: trip.needsHotelBooking,
    perDiemAllowance: trip.perDiemAllowance
      ? Number(trip.perDiemAllowance)
      : createTripDefaults.perDiemAllowance,
    estimatedCost: trip.estimatedCost
      ? Number(trip.estimatedCost)
      : createTripDefaults.estimatedCost,
    currency: trip.currency ?? createTripDefaults.currency,
    departureCity: trip.departureCity ?? createTripDefaults.departureCity,
    arrivalCity: trip.arrivalCity ?? createTripDefaults.arrivalCity,
    preferredDepartureDate: trip.preferredDepartureDate
      ? new Date(trip.preferredDepartureDate)
      : createTripDefaults.preferredDepartureDate,
    preferredArrivalDate: trip.preferredArrivalDate
      ? new Date(trip.preferredArrivalDate)
      : createTripDefaults.preferredArrivalDate,
    travelClass: trip.travelClass ?? createTripDefaults.travelClass,
    flightNotes: trip.flightNotes ?? createTripDefaults.flightNotes,
    replacementDuringTravelUserId:
      trip.replacementDuringTravelUserId ??
      createTripDefaults.replacementDuringTravelUserId ??
      undefined,
    airTicketBookedBy:
      trip.airTicketBookedBy ?? createTripDefaults.airTicketBookedBy,
    hotelArrangedBy: trip.hotelArrangedBy ?? createTripDefaults.hotelArrangedBy,
    addressDuringTrip:
      trip.addressDuringTrip ?? createTripDefaults.addressDuringTrip,
    contactDetailsDuringTrip:
      trip.contactDetailsDuringTrip ??
      createTripDefaults.contactDetailsDuringTrip,
  };

  return (
    <div className="container max-w-4xl space-y-8 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="font-bold text-3xl tracking-tight">
            Edit Business Trip
          </h1>
          <p className="text-muted-foreground">
            Update the trip details, then return to the trip page to resubmit
            it.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/business-trips/${trip.id}`}>
            <ArrowLeft className="mr-2 size-4" />
            Back to trip
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-8">
          <BusinessTripForm
            initialValues={initialValues}
            mode="page"
            onCancel={() => router.push(`/business-trips/${trip.id}`)}
            onSuccess={() => {
              router.push(`/business-trips/${trip.id}`);
            }}
            requestId={trip.id}
            submitLabel="Save Changes"
            successMessage="Business trip updated successfully"
            version={trip.version}
          />
        </CardContent>
      </Card>
    </div>
  );
}
