"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { client, orpc } from "@/utils/orpc";

type TransitionAction =
  | "SUBMIT"
  | "APPROVE"
  | "REJECT"
  | "REQUEST_CHANGE"
  | "HOLD";

type TripAction = "SUBMIT" | "APPROVE" | "REJECT" | "CANCEL";

export default function ApprovalsPage() {
  const queryClient = useQueryClient();
  const { data: requests, isLoading } = useQuery(
    orpc.requests.getPendingApprovals.queryOptions(),
  );
  const { data: trips, isLoading: tripsLoading } = useQuery(
    orpc.businessTrips.getPendingApprovals.queryOptions(),
  );
  const [_selectedRequest, setSelectedRequest] = useState<string | null>(null);

  const transitionMutation = useMutation({
    mutationFn: (data: {
      requestId: string;
      action: TransitionAction;
      comment?: string;
    }) => client.workflow.transition(data),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setSelectedRequest(null);
    },
  });

  const handleAction = (requestId: string, action: TransitionAction) => {
    transitionMutation.mutate({ requestId, action });
  };

  const tripTransition = useMutation({
    mutationFn: (data: {
      tripId: string;
      action: TripAction;
      comment?: string;
    }) => client.businessTrips.transition(data),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 font-bold text-2xl">Pending Approvals</h1>
      <div className="space-y-4">
        {requests?.map((request) => (
          <div className="rounded border p-4" key={request.id}>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{request.requestCode}</h3>
                <p className="text-muted-foreground text-sm">
                  {(request.positionDetails as { title: string }).title}
                </p>
                <p className="text-muted-foreground text-xs">
                  Status: {request.status} • Awaiting{" "}
                  {request.currentApproverRole} approval
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded bg-green-500 px-3 py-1 text-primary text-sm hover:bg-green-600"
                  onClick={() => handleAction(request.id, "APPROVE")}
                  type="button"
                >
                  Approve
                </button>
                <button
                  className="rounded bg-red-500 px-3 py-1 text-primary text-sm hover:bg-red-600"
                  onClick={() => handleAction(request.id, "REJECT")}
                  type="button"
                >
                  Reject
                </button>
                <button
                  className="rounded bg-yellow-500 px-3 py-1 text-primary text-sm hover:bg-yellow-600"
                  onClick={() => handleAction(request.id, "REQUEST_CHANGE")}
                  type="button"
                >
                  Request Change
                </button>
              </div>
            </div>
          </div>
        ))}
        <h2 className="mt-8 font-semibold text-lg">Trips</h2>
        {tripsLoading ? (
          <div>Loading trips...</div>
        ) : (
          trips?.map((trip) => (
            <div className="rounded border p-4" key={trip.id}>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{trip.destination}</h3>
                  <p className="text-muted-foreground text-sm">
                    {trip.purpose}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded bg-green-500 px-3 py-1 text-primary text-sm hover:bg-green-600"
                    onClick={() =>
                      tripTransition.mutate({
                        tripId: trip.id,
                        action: "APPROVE",
                      })
                    }
                    type="button"
                  >
                    Approve
                  </button>
                  <button
                    className="rounded bg-red-500 px-3 py-1 text-primary text-sm hover:bg-red-600"
                    onClick={() =>
                      tripTransition.mutate({
                        tripId: trip.id,
                        action: "REJECT",
                      })
                    }
                    type="button"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
