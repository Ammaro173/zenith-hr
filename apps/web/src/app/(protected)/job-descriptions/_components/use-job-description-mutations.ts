"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UserRole } from "@/types/users";
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
    departmentId: string | null;
    assignedRole: UserRole;
  }) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: JobDescriptionFormData) =>
      client.jobDescriptions.create({
        title: data.title,
        description: data.description,
        responsibilities: data.responsibilities ?? "",
        departmentId: data.departmentId,
        reportsToPositionId: data.reportsToPositionId,
        assignedRole: data.assignedRole,
        grade: data.grade,
        minSalary: data.minSalary,
        maxSalary: data.maxSalary,
      }),
    onSuccess: async (result) => {
      toast.success("Job description created successfully");
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            Array.isArray(key[0]) &&
            key[0][0] === "jobDescriptions"
          );
        },
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
        responsibilities: data.responsibilities ?? "",
        departmentId: data.departmentId,
        reportsToPositionId: data.reportsToPositionId,
        assignedRole: data.assignedRole,
        grade: data.grade,
        minSalary: data.minSalary,
        maxSalary: data.maxSalary,
      }),
    onSuccess: async () => {
      toast.success("Job description updated successfully");
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            Array.isArray(key[0]) &&
            key[0][0] === "jobDescriptions"
          );
        },
      });
      options?.onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update job description");
    },
  });
}
