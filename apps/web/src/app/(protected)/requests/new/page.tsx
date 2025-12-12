"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { client } from "@/utils/orpc";

type RequestFormState = {
  requestType: "NEW_POSITION" | "REPLACEMENT";
  isBudgeted: boolean;
  replacementForUserId: string;
  contractDuration: "FULL_TIME" | "TEMPORARY" | "CONSULTANT";
  justificationText: string;
  salaryRangeMin: number;
  salaryRangeMax: number;
  positionDetails: {
    title: string;
    department: string;
    description: string;
  };
  budgetDetails: {
    currency: string;
    notes: string;
  };
};

export default function NewRequestPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RequestFormState>({
    requestType: "NEW_POSITION",
    isBudgeted: false,
    replacementForUserId: "",
    contractDuration: "FULL_TIME",
    justificationText: "",
    salaryRangeMin: 0,
    salaryRangeMax: 0,
    positionDetails: {
      title: "",
      department: "",
      description: "",
    },
    budgetDetails: {
      currency: "USD",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => client.requests.create(data),
    onSuccess: () => {
      router.push("/requests");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      formData.requestType === "REPLACEMENT" &&
      !formData.replacementForUserId
    ) {
      toast.error("Replacement user ID is required for replacement requests");
      return;
    }
    if (formData.salaryRangeMin > formData.salaryRangeMax) {
      toast.error("Minimum salary cannot exceed maximum salary");
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-bold text-2xl">Create Manpower Request</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block font-medium text-sm" htmlFor="request-type">
              Request Type
            </label>
            <select
              className="mt-1 w-full rounded border p-2"
              id="request-type"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  requestType: e.target.value as typeof formData.requestType,
                  replacementForUserId:
                    e.target.value === "NEW_POSITION"
                      ? ""
                      : formData.replacementForUserId,
                })
              }
              value={formData.requestType}
            >
              <option value="NEW_POSITION">New Position</option>
              <option value="REPLACEMENT">Replacement</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <input
              checked={formData.isBudgeted}
              id="is-budgeted"
              onChange={(e) =>
                setFormData({ ...formData, isBudgeted: e.target.checked })
              }
              type="checkbox"
            />
            <label className="font-medium text-sm" htmlFor="is-budgeted">
              Budgeted
            </label>
          </div>
        </div>

        {formData.requestType === "REPLACEMENT" && (
          <div>
            <label
              className="block font-medium text-sm"
              htmlFor="replacement-for"
            >
              Replacement User ID
            </label>
            <input
              className="mt-1 w-full rounded border p-2"
              id="replacement-for"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  replacementForUserId: e.target.value,
                })
              }
              placeholder="UUID of user being replaced"
              required
              type="text"
              value={formData.replacementForUserId}
            />
          </div>
        )}

        <div>
          <label
            className="block font-medium text-sm"
            htmlFor="contract-duration"
          >
            Contract Duration
          </label>
          <select
            className="mt-1 w-full rounded border p-2"
            id="contract-duration"
            onChange={(e) =>
              setFormData({
                ...formData,
                contractDuration: e.target
                  .value as typeof formData.contractDuration,
              })
            }
            value={formData.contractDuration}
          >
            <option value="FULL_TIME">Full Time</option>
            <option value="TEMPORARY">Temporary</option>
            <option value="CONSULTANT">Consultant</option>
          </select>
        </div>

        <div>
          <label className="block font-medium text-sm" htmlFor="position-title">
            Position Title
          </label>
          <input
            className="mt-1 w-full rounded border p-2"
            id="position-title"
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
          <label className="block font-medium text-sm" htmlFor="department">
            Department
          </label>
          <input
            className="mt-1 w-full rounded border p-2"
            id="department"
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
          <label className="block font-medium text-sm" htmlFor="description">
            Role Description
          </label>
          <textarea
            className="mt-1 w-full rounded border p-2"
            id="description"
            onChange={(e) =>
              setFormData({
                ...formData,
                positionDetails: {
                  ...formData.positionDetails,
                  description: e.target.value,
                },
              })
            }
            value={formData.positionDetails.description}
          />
        </div>
        <div>
          <label className="block font-medium text-sm" htmlFor="justification">
            Justification
          </label>
          <textarea
            className="mt-1 w-full rounded border p-2"
            id="justification"
            onChange={(e) =>
              setFormData({
                ...formData,
                justificationText: e.target.value,
              })
            }
            required
            value={formData.justificationText}
          />
        </div>
        <div>
          <label className="block font-medium text-sm" htmlFor="salary-min">
            Salary Min
          </label>
          <input
            className="mt-1 w-full rounded border p-2"
            id="salary-min"
            onChange={(e) =>
              setFormData({
                ...formData,
                salaryRangeMin: Number(e.target.value),
              })
            }
            required
            type="number"
            value={formData.salaryRangeMin}
          />
        </div>
        <div>
          <label className="block font-medium text-sm" htmlFor="salary-max">
            Salary Max
          </label>
          <input
            className="mt-1 w-full rounded border p-2"
            id="salary-max"
            onChange={(e) =>
              setFormData({
                ...formData,
                salaryRangeMax: Number(e.target.value),
              })
            }
            required
            type="number"
            value={formData.salaryRangeMax}
          />
        </div>
        <div>
          <label className="block font-medium text-sm" htmlFor="currency">
            Currency
          </label>
          <input
            className="mt-1 w-full rounded border p-2"
            id="currency"
            onChange={(e) =>
              setFormData({
                ...formData,
                budgetDetails: {
                  ...formData.budgetDetails,
                  currency: e.target.value,
                },
              })
            }
            required
            type="text"
            value={formData.budgetDetails.currency}
          />
        </div>
        <div>
          <label className="block font-medium text-sm" htmlFor="budget-notes">
            Budget Notes
          </label>
          <textarea
            className="mt-1 w-full rounded border p-2"
            id="budget-notes"
            onChange={(e) =>
              setFormData({
                ...formData,
                budgetDetails: {
                  ...formData.budgetDetails,
                  notes: e.target.value,
                },
              })
            }
            value={formData.budgetDetails.notes}
          />
        </div>
        <button
          className="rounded bg-blue-500 px-4 py-2 text-primary hover:bg-blue-600 disabled:opacity-50"
          disabled={createMutation.isPending}
          type="submit"
        >
          {createMutation.isPending ? "Creating..." : "Create Request"}
        </button>
      </form>
    </div>
  );
}
