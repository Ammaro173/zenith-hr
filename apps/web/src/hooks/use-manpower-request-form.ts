import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import type { createRequestSchema } from "@zenith-hr/api/modules/requests/requests.schema";
import { toast } from "sonner";
import type { z } from "zod";
import { DEFAULT_FORM_VALUES } from "@/components/requests/manpower-request-form.constants";
import { client } from "@/utils/orpc";

export type FormValues = z.infer<typeof createRequestSchema>;

type UseManpowerRequestFormProps = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function useManpowerRequestForm({
  onSuccess,
  onCancel,
}: UseManpowerRequestFormProps = {}) {
  const createMutation = useMutation({
    mutationFn: (data: FormValues) => client.requests.create(data),
    onSuccess: () => {
      toast.success("Manpower request submitted successfully");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit request");
    },
  });

  const form = useForm({
    defaultValues: {
      requestType: DEFAULT_FORM_VALUES.requestType as
        | "NEW_POSITION"
        | "REPLACEMENT",
      isBudgeted: DEFAULT_FORM_VALUES.isBudgeted as boolean,
      replacementForUserId: undefined as string | undefined,
      contractDuration: DEFAULT_FORM_VALUES.contractDuration as
        | "FULL_TIME"
        | "TEMPORARY"
        | "CONSULTANT",
      justificationText: DEFAULT_FORM_VALUES.justificationText as string,
      salaryRangeMin: DEFAULT_FORM_VALUES.salaryRangeMin as number,
      salaryRangeMax: DEFAULT_FORM_VALUES.salaryRangeMax as number,
      positionDetails: {
        title: DEFAULT_FORM_VALUES.positionDetails.title as string,
        department: DEFAULT_FORM_VALUES.positionDetails.department as string,
        description: DEFAULT_FORM_VALUES.positionDetails.description as string,
        location: DEFAULT_FORM_VALUES.positionDetails.location as string,
        startDate: undefined as string | undefined,
        reportingTo: undefined as string | undefined,
      },
      budgetDetails: {
        currency: DEFAULT_FORM_VALUES.budgetDetails.currency as string,
        notes: DEFAULT_FORM_VALUES.budgetDetails.notes as string,
        costCenter: undefined as string | undefined,
        budgetCode: undefined as string | undefined,
      },
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync(value as FormValues);
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
