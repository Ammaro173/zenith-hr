"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { client, orpc } from "@/utils/orpc";

function getStatusBadgeClass(status: string): string {
  if (status === "SIGNED") {
    return "bg-green-100 text-green-800";
  }
  if (status === "SENT_FOR_SIGNATURE") {
    return "bg-yellow-100 text-yellow-800";
  }
  return "bg-muted-foreground text-muted-foreground-800";
}

export default function ContractPage() {
  const params = useParams();
  const contractId = params.id as string;

  const { data: contract, isLoading } = useQuery(
    orpc.contracts.getById.queryOptions({ input: { id: contractId } })
  );

  const sendMutation = useMutation({
    mutationFn: (id: string) => client.contracts.sendForSignature({ id }),
  });

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!contract) {
    return (
      <div className="container mx-auto px-4 py-8">Contract not found</div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 font-bold text-2xl">Contract Details</h1>
      <div className="rounded border p-6">
        <div className="mb-4">
          <h3 className="font-semibold">Candidate</h3>
          <p>{contract.candidateName}</p>
          <p className="text-muted-foreground text-sm">
            {contract.candidateEmail}
          </p>
        </div>
        <div className="mb-4">
          <h3 className="font-semibold">Status</h3>
          <span
            className={`rounded px-2 py-1 text-xs ${getStatusBadgeClass(
              contract.status
            )}`}
          >
            {contract.status}
          </span>
        </div>
        {contract.status === "DRAFT" && (
          <button
            className="rounded bg-blue-500 px-4 py-2 text-primary hover:bg-blue-600 disabled:opacity-50"
            disabled={sendMutation.isPending}
            onClick={() => sendMutation.mutate(contractId)}
            type="button"
          >
            {sendMutation.isPending ? "Sending..." : "Send for Signature"}
          </button>
        )}
      </div>
    </div>
  );
}
