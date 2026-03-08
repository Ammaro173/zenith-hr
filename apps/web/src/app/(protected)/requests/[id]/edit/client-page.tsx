"use client";

import { useQuery } from "@tanstack/react-query";
import { createRequestDefaults } from "@zenith-hr/api/modules/requests/requests.schema";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ManpowerRequestForm } from "@/features/manpower-requests";
import type { FormValues } from "@/features/manpower-requests/use-manpower-request-form";
import { orpc } from "@/utils/orpc";

interface EditRequestClientPageProps {
  currentUserId?: string;
}

const EDITABLE_STATUSES = ["DRAFT", "CHANGE_REQUESTED"] as const;

export function EditRequestClientPage({
  currentUserId,
}: EditRequestClientPageProps) {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const { data: request, isLoading } = useQuery(
    orpc.requests.getById.queryOptions({ input: { id: params.id } }),
  );

  if (isLoading) {
    return (
      <div className="flex h-100 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container max-w-3xl space-y-4 py-10">
        <p className="text-muted-foreground">Request not found.</p>
        <Button asChild variant="outline">
          <Link href="/requests">Back to requests</Link>
        </Button>
      </div>
    );
  }

  const canEdit =
    request.requester?.id === currentUserId &&
    EDITABLE_STATUSES.includes(
      request.status as (typeof EDITABLE_STATUSES)[number],
    );

  if (!canEdit) {
    return (
      <div className="container max-w-3xl space-y-6 py-10">
        <div className="space-y-1">
          <h1 className="font-bold text-3xl tracking-tight">Edit Request</h1>
          <p className="text-muted-foreground">
            Only draft or change-requested requests owned by you can be edited.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/requests/${request.id}`}>
            <ArrowLeft className="mr-2 size-4" />
            Back to request
          </Link>
        </Button>
      </div>
    );
  }

  const budgetDetails = (request.budgetDetails ?? {}) as {
    currency?: string;
    notes?: string;
  };
  const positionDetails = (request.positionDetails ?? {}) as {
    title?: string;
    department?: string;
    description?: string;
    location?: string;
    startDate?: string;
    reportingTo?: string;
  };

  const initialValues: FormValues = {
    requestType: request.requestType,
    replacementForUserId:
      request.replacementForUser?.id ??
      request.replacementForUserId ??
      undefined,
    contractDuration: request.contractDuration,
    employmentType:
      request.employmentType ?? createRequestDefaults.employmentType,
    headcount: request.headcount ?? createRequestDefaults.headcount,
    positionId: request.positionId ?? createRequestDefaults.positionId,
    justificationText:
      request.justificationText ?? createRequestDefaults.justificationText,
    salaryRangeMin:
      Number(request.salaryRangeMin) || createRequestDefaults.salaryRangeMin,
    salaryRangeMax:
      Number(request.salaryRangeMax) || createRequestDefaults.salaryRangeMax,
    positionDetails: {
      ...createRequestDefaults.positionDetails,
      ...positionDetails,
      location:
        positionDetails.location ??
        createRequestDefaults.positionDetails.location,
    },
    budgetDetails: {
      ...createRequestDefaults.budgetDetails,
      currency:
        budgetDetails.currency ?? createRequestDefaults.budgetDetails.currency,
      notes: budgetDetails.notes ?? createRequestDefaults.budgetDetails.notes,
    },
  };

  return (
    <div className="container max-w-4xl space-y-8 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="font-bold text-3xl tracking-tight">
            Edit Manpower Request
          </h1>
          <p className="text-muted-foreground">
            Update the request details, then return to the request page to
            resubmit it.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/requests/${request.id}`}>
            <ArrowLeft className="mr-2 size-4" />
            Back to request
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-8">
          <ManpowerRequestForm
            initialValues={initialValues}
            mode="page"
            onCancel={() => router.push(`/requests/${request.id}`)}
            onSuccess={() => {
              router.push(`/requests/${request.id}`);
            }}
            requestId={request.id}
            submitLabel="Save Changes"
            successMessage="Manpower request updated successfully"
            version={request.version}
          />
        </CardContent>
      </Card>
    </div>
  );
}
