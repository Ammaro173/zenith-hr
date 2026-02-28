"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createSeparationDefaults,
  createSeparationSchema,
} from "@zenith-hr/api/modules/separations/separations.schema";
import { toast } from "sonner";
import { client } from "@/utils/orpc";

interface UseSeparationFormProps {
  onCancel?: () => void;
  onSuccess?: () => void;
}

export function useSeparationForm({
  onSuccess,
  onCancel,
}: UseSeparationFormProps = {}) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: typeof createSeparationDefaults) =>
      client.separations.create(data),
    onSuccess: async () => {
      toast.success("Separation request submitted");
      await queryClient.invalidateQueries();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit separation request");
    },
  });

  const form = useForm({
    defaultValues: createSeparationDefaults,
    validators: {
      onChange: createSeparationSchema,
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
    isPending: createMutation.isPending,
    handleCancel,
  };
}

export type SeparationFormType = ReturnType<typeof useSeparationForm>["form"];
