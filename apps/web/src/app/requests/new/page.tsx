"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { orpc } from "@/utils/orpc";

export default function NewRequestPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    positionDetails: {
      title: "",
      department: "",
      justification: "",
      type: "FULL_TIME" as const,
    },
    budgetDetails: {
      salaryMin: 0,
      salaryMax: 0,
      currency: "USD",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => orpc.requests.create.mutate(data),
    onSuccess: () => {
      router.push("/requests");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-bold text-2xl">Create Manpower Request</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block font-medium text-sm">Position Title</label>
          <input
            className="mt-1 w-full rounded border p-2"
            onChange={(e) =>
              setFormData({
                ...formData,
                positionDetails: {
                  ...formData.positionDetails,
                  title: e.target.value,
                },
              })
            }
            required
            type="text"
            value={formData.positionDetails.title}
          />
        </div>
        <div>
          <label className="block font-medium text-sm">Department</label>
          <input
            className="mt-1 w-full rounded border p-2"
            onChange={(e) =>
              setFormData({
                ...formData,
                positionDetails: {
                  ...formData.positionDetails,
                  department: e.target.value,
                },
              })
            }
            required
            type="text"
            value={formData.positionDetails.department}
          />
        </div>
        <div>
          <label className="block font-medium text-sm">Justification</label>
          <textarea
            className="mt-1 w-full rounded border p-2"
            onChange={(e) =>
              setFormData({
                ...formData,
                positionDetails: {
                  ...formData.positionDetails,
                  justification: e.target.value,
                },
              })
            }
            required
            value={formData.positionDetails.justification}
          />
        </div>
        <div>
          <label className="block font-medium text-sm">Salary Min</label>
          <input
            className="mt-1 w-full rounded border p-2"
            onChange={(e) =>
              setFormData({
                ...formData,
                budgetDetails: {
                  ...formData.budgetDetails,
                  salaryMin: Number(e.target.value),
                },
              })
            }
            required
            type="number"
            value={formData.budgetDetails.salaryMin}
          />
        </div>
        <div>
          <label className="block font-medium text-sm">Salary Max</label>
          <input
            className="mt-1 w-full rounded border p-2"
            onChange={(e) =>
              setFormData({
                ...formData,
                budgetDetails: {
                  ...formData.budgetDetails,
                  salaryMax: Number(e.target.value),
                },
              })
            }
            required
            type="number"
            value={formData.budgetDetails.salaryMax}
          />
        </div>
        <button
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
          disabled={createMutation.isPending}
          type="submit"
        >
          {createMutation.isPending ? "Creating..." : "Create Request"}
        </button>
      </form>
    </div>
  );
}
