"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createSeparationDefaults,
  createSeparationSchema,
} from "@zenith-hr/api/modules/separations/separations.schema";
import { useState } from "react";
import { toast } from "sonner";
import { client } from "@/utils/orpc";

interface UseSeparationFormProps {
  onCancel?: () => void;
  onSuccess?: (request: { id: string }) => void;
}

export function useSeparationForm({
  onSuccess,
  onCancel,
}: UseSeparationFormProps = {}) {
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: typeof createSeparationDefaults) =>
      client.separations.create(data),
    onError: (error) => {
      toast.error(error.message || "Failed to submit separation request");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (data: { separationId: string; file: File }) => {
      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(data.file);
        reader.onload = async () => {
          try {
            const base64String = reader.result as string;
            const base64 = base64String.split(",")[1] ?? "";

            await client.separations.uploadDocument({
              separationId: data.separationId,
              kind: "RESIGNATION_LETTER",
              fileName: data.file.name,
              contentType: data.file.type || "application/octet-stream",
              fileBase64: base64,
            });
            resolve();
          } catch (e) {
            reject(e);
          }
        };
        reader.onerror = (e) => reject(e);
      });
    },
  });

  const form = useForm({
    defaultValues: createSeparationDefaults,
    validators: {
      onChange: createSeparationSchema,
    },
    onSubmit: async ({ value }) => {
      if (value.type === "RESIGNATION" && !file) {
        toast.error("Resignation letter is required");
        return;
      }

      const request = await createMutation.mutateAsync(value);

      if (value.type === "RESIGNATION" && file && request?.id) {
        try {
          await uploadMutation.mutateAsync({ separationId: request.id, file });
        } catch {
          toast.error(
            "Separation created, but failed to upload resignation letter",
          );
          await queryClient.invalidateQueries();
          if (request?.id) {
            onSuccess?.({ id: request.id });
          }
          return;
        }
      }

      toast.success("Separation request submitted");
      await queryClient.invalidateQueries();
      if (request?.id) {
        onSuccess?.({ id: request.id });
      }
    },
  });

  const handleCancel = () => {
    form.reset();
    setFile(null);
    onCancel?.();
  };

  return {
    form,
    file,
    setFile,
    isPending: createMutation.isPending || uploadMutation.isPending,
    handleCancel,
  };
}

export type SeparationFormType = ReturnType<typeof useSeparationForm>["form"];
