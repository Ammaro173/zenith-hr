"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/utils/orpc";
import type { JobDescriptionFormData } from "./job-description-form";

/**
 * Shared hook for job description mutations
 */
export function useCreateJobDescription(options?: {
  onSuccess?: (result: {
    id: string;
    title: string;
    description: string;
    responsibilities: string | null;
  }) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: JobDescriptionFormData) =>
      client.jobDescriptions.create({
        title: data.title,
        description: data.description,
        responsibilities: data.responsibilities ?? undefined,
      }),
    onSuccess: (result) => {
      toast.success("Job description created successfully");
      queryClient.invalidateQueries({
        queryKey: ["jobDescriptions"],
      });
      options?.onSuccess?.(result);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create job description");
    },
  });
}

export function useUpdateJobDescription(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: JobDescriptionFormData & { id: string }) =>
      client.jobDescriptions.update({
        id: data.id,
        title: data.title,
        description: data.description,
        responsibilities: data.responsibilities ?? undefined,
      }),
    onSuccess: () => {
      toast.success("Job description updated successfully");
      queryClient.invalidateQueries({
        queryKey: ["jobDescriptions"],
      });
      options?.onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update job description");
    },
  });
}
