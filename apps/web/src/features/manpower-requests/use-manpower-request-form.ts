import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createRequestDefaults,
  createRequestSchema,
} from "@zenith-hr/api/modules/requests/requests.schema";
import { toast } from "sonner";
import type { z } from "zod";
import { client } from "@/utils/orpc";

export type FormValues = z.infer<typeof createRequestSchema>;

interface UseManpowerRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function useManpowerRequestForm({
  onSuccess,
  onCancel,
}: UseManpowerRequestFormProps = {}) {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof createRequestSchema>) =>
      client.requests.create(data),
    onSuccess: () => {
      toast.success("Manpower request submitted successfully");
      queryClient.invalidateQueries();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit request");
    },
  });

  const form = useForm({
    defaultValues: createRequestDefaults,
    validators: {
      onChange: createRequestSchema,
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
