"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createSeparationDefaults,
  createSeparationSchema,
  elevatedSeparationTypes,
} from "@zenith-hr/api/modules/separations/separations.schema";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { client } from "@/utils/orpc";

interface UseSeparationFormProps {
  enableSubjectPicker?: boolean;
  onCancel?: () => void;
  onSuccess?: (request: { id: string }) => void;
}

export function useSeparationForm({
  enableSubjectPicker = false,
  onSuccess,
  onCancel,
}: UseSeparationFormProps = {}) {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const appliedDefaultSubject = useRef(false);

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
      const actorId = session?.user?.id;
      if (!actorId) {
        toast.error("You must be signed in to submit");
        return;
      }

      const subjectId = value.subjectUserId ?? actorId;
      const elevated = (elevatedSeparationTypes as readonly string[]).includes(
        value.type,
      );
      if (elevated && subjectId === actorId) {
        toast.error("Select the employee this separation applies to");
        return;
      }

      const needsResignationLetter =
        value.type === "RESIGNATION" && subjectId === actorId;
      if (needsResignationLetter && !file) {
        toast.error("Resignation letter is required");
        return;
      }

      const payload = {
        ...value,
        subjectUserId:
          value.subjectUserId === actorId ? undefined : value.subjectUserId,
      };

      const request = await createMutation.mutateAsync(payload);

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

  useEffect(() => {
    if (!enableSubjectPicker || appliedDefaultSubject.current) {
      return;
    }
    const id = session?.user?.id;
    if (!id) {
      return;
    }
    form.setFieldValue("subjectUserId", id);
    appliedDefaultSubject.current = true;
  }, [enableSubjectPicker, session?.user?.id, form]);

  const handleCancel = () => {
    appliedDefaultSubject.current = false;
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
