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
  ...createRequestDefaults,
  ...initialValues,
  positionDetails: {
    ...createRequestDefaults.positionDetails,
    ...initialValues?.positionDetails,
  },
  budgetDetails: {
    ...createRequestDefaults.budgetDetails,
    ...initialValues?.budgetDetails,
  },
});

export function useManpowerRequestForm({
  initialValues,
  onSuccess,
  onCancel,
  requestId,
  successMessage,
  version,
}: UseManpowerRequestFormProps = {}) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(requestId);
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof createRequestSchema>) => {
      if (isEditing) {
        if (!(requestId && typeof version === "number")) {
          throw new Error("Missing request version for update");
        }

        return await client.requests.update({
          id: requestId,
          data,
          version,
        });
      }

      return await client.requests.create(data);
    },
    onSuccess: async () => {
      toast.success(
        successMessage ??
          (isEditing
            ? "Manpower request updated successfully"
            : "Manpower request submitted successfully"),
      );
      await queryClient.invalidateQueries();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(
        error.message ||
          (isEditing ? "Failed to update request" : "Failed to submit request"),
      );
    },
  });

  const form = useForm({
    defaultValues: mergeInitialValues(initialValues),
    validators: {
      onChange: createRequestSchema,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
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
