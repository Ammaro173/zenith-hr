import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createTripDefaults,
  createTripSchema,
} from "@zenith-hr/api/modules/business-trips/business-trips.schema";
import { useMemo } from "react";
import { toast } from "sonner";
import { client } from "@/utils/orpc";
import type { CreateTripInput } from "./types";

interface UseBusinessTripFormProps {
  onCancel?: () => void;
  onSuccess?: () => void;
}

export function useBusinessTripForm({
  onSuccess,
  onCancel,
}: UseBusinessTripFormProps = {}) {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (data: CreateTripInput) => client.businessTrips.create(data),
    onSuccess: async () => {
      toast.success("Business trip request submitted successfully");
      await queryClient.invalidateQueries();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit request");
    },
  });

  // We explicitly recreate `new Date()` here to avoid stale default dates.
  // Because `createTripDefaults.startDate` is initialized exactly once when the schema file loads,
  // forms left open across midnight would default to yesterday's date, tripping past-date validation.
  const defaultValues = useMemo(
    () => ({
      ...createTripDefaults,
      startDate: new Date(),
      endDate: new Date(),
    }),
    [],
  );

  const form = useForm({
    defaultValues,
    validators: {
      onChange: createTripSchema,
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync(value);
    },
  });

  const handleCancel = () => {
    form.reset();
    onCancel?.();
  };

  return {
    form,
    createMutation,
    handleCancel,
    isPending: createMutation.isPending,
  };
}

export type BusinessTripFormType = ReturnType<
  typeof useBusinessTripForm
>["form"];
