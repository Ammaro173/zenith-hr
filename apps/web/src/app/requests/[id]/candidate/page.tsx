"use client";

import { useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { orpc } from "@/utils/orpc";

export default function CandidateSelectionPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  const [formData, setFormData] = useState({
    candidateName: "",
    candidateEmail: "",
    cvFile: null as File | null,
  });

  const selectMutation = useMutation({
    mutationFn: async (data: { requestId: string; candidateId: string }) => {
      // In real implementation, upload CV first, then select
      return orpc.candidates.selectCandidate.mutate(data);
    },
    onSuccess: () => {
      router.push(`/contracts?requestId=${requestId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock candidate ID
    selectMutation.mutate({
      requestId,
      candidateId: `${requestId}_${formData.candidateEmail}`,
    });
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-bold text-2xl">Select Candidate</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block font-medium text-sm">Candidate Name</label>
          <input
            className="mt-1 w-full rounded border p-2"
            onChange={(e) =>
              setFormData({ ...formData, candidateName: e.target.value })
            }
            required
            type="text"
            value={formData.candidateName}
          />
        </div>
        <div>
          <label className="block font-medium text-sm">Candidate Email</label>
          <input
            className="mt-1 w-full rounded border p-2"
            onChange={(e) =>
              setFormData({ ...formData, candidateEmail: e.target.value })
            }
            required
            type="email"
            value={formData.candidateEmail}
          />
        </div>
        <div>
          <label className="block font-medium text-sm">CV File</label>
          <input
            accept=".pdf"
            className="mt-1 w-full rounded border p-2"
            onChange={(e) =>
              setFormData({
                ...formData,
                cvFile: e.target.files?.[0] || null,
              })
            }
            type="file"
          />
        </div>
        <button
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
          disabled={selectMutation.isPending}
          type="submit"
        >
          {selectMutation.isPending ? "Selecting..." : "Select Candidate"}
        </button>
      </form>
    </div>
  );
}
