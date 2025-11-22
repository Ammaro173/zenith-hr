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

export default function ApprovalsPage() {
  const queryClient = useQueryClient();
  const { data: requests, isLoading } = useQuery(
    orpc.requests.getPendingApprovals.queryOptions()
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
                <p className="text-gray-600 text-sm">
                  {(request.positionDetails as { title: string }).title}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600"
                  onClick={() => handleAction(request.id, "APPROVE")}
                  type="button"
                >
                  Approve
                </button>
                <button
                  className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
                  onClick={() => handleAction(request.id, "REJECT")}
                  type="button"
                >
                  Reject
                </button>
                <button
                  className="rounded bg-yellow-500 px-3 py-1 text-sm text-white hover:bg-yellow-600"
                  onClick={() => handleAction(request.id, "REQUEST_CHANGE")}
                  type="button"
                >
                  Request Change
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
