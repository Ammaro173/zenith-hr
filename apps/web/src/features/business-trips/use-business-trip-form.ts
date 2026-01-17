import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createTripDefaults,
  createTripSchema,
} from "@zenith-hr/api/modules/business-trips/business-trips.schema";
import { toast } from "sonner";
import { client } from "@/utils/orpc";
import type { CreateTripInput } from "./types";

interface UseBusinessTripFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function useBusinessTripForm({
  onSuccess,
  onCancel,
}: UseBusinessTripFormProps = {}) {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (data: CreateTripInput) => client.businessTrips.create(data),
    onSuccess: () => {
      toast.success("Business trip request submitted successfully");
      queryClient.invalidateQueries();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit request");
    },
  });

  const form = useForm({
    defaultValues: createTripDefaults,
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
