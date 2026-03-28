import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createTripDefaults,
  createTripSchema,
} from "@zenith-hr/api/modules/business-trips/business-trips.schema";
import { useMemo } from "react";
import { toast } from "sonner";
import { client } from "@/utils/orpc";
import type { CreateTripInput, FormValues } from "./types";

interface UseBusinessTripFormProps {
  initialValues?: Partial<FormValues>;
  onCancel?: () => void;
  onSuccess?: () => void;
  requestId?: string;
  successMessage?: string;
  version?: number;
}

const mergeInitialValues = (
  initialValues?: Partial<FormValues>,
): FormValues => ({
  ...createTripDefaults,
  ...initialValues,
});

export function useBusinessTripForm({
  initialValues,
  onSuccess,
  onCancel,
  requestId,
  successMessage,
  version,
}: UseBusinessTripFormProps = {}) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(requestId);
  const mutation = useMutation({
    mutationFn: async (data: CreateTripInput) => {
      if (isEditing) {
        if (!(requestId && typeof version === "number")) {
          throw new Error("Missing trip version for update");
        }

        return await client.businessTrips.update({
          id: requestId,
          data,
          version,
        });
      }

      return await client.businessTrips.create(data);
    },
    onSuccess: async () => {
      toast.success(
        successMessage ??
          (isEditing
            ? "Business trip updated successfully"
            : "Business trip request submitted successfully"),
      );
      await queryClient.invalidateQueries();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(
        error.message ||
          (isEditing ? "Failed to update trip" : "Failed to submit request"),
      );
    },
  });

  // We explicitly recreate `new Date()` here to avoid stale default dates.
  // Because `createTripDefaults.startDate` is initialized exactly once when the schema file loads,
  // forms left open across midnight would default to yesterday's date, tripping past-date validation.
  const defaultValues = useMemo((): FormValues => {
    const now = new Date();
    const mergedValues = mergeInitialValues(initialValues);

    return {
      ...mergedValues,
      startDate: initialValues?.startDate ?? now,
      endDate: initialValues?.endDate ?? now,
    };
  }, [initialValues]);

  const form = useForm({
    defaultValues,
    validators: {
      onChange: createTripSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = createTripSchema.parse(value);
      await mutation.mutateAsync(parsed);
    },
  });

  const handleCancel = () => {
    form.reset();
    onCancel?.();
  };

  return {
    form,
    mutation,
    handleCancel,
    isEditing,
    isPending: mutation.isPending,
  };
}

export type BusinessTripFormType = ReturnType<
  typeof useBusinessTripForm
>["form"];
