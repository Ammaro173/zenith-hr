"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/utils/orpc";
import type { PositionFormData } from "./position-form";

export function useCreatePosition(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PositionFormData) =>
      client.positions.create({
        name: data.name,
        code: data.code,
        description: data.description,
        responsibilities: data.responsibilities,
        departmentId: data.departmentId,
        reportsToPositionId: data.reportsToPositionId,
        role: data.role,
        grade: data.grade,
        active: data.active,
      }),
    onSuccess: async () => {
      toast.success("Position created successfully");
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            Array.isArray(key[0]) &&
            key[0][0] === "positions"
          );
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create position");
    },
  });
}

export function useUpdatePosition(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PositionFormData & { id: string }) =>
      client.positions.update({
        id: data.id,
        data: {
          name: data.name,
          code: data.code,
          description: data.description,
          responsibilities: data.responsibilities,
          departmentId: data.departmentId,
          reportsToPositionId: data.reportsToPositionId,
          role: data.role,
          grade: data.grade,
          active: data.active,
        },
      }),
    onSuccess: async () => {
      toast.success("Position updated successfully");
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            Array.isArray(key[0]) &&
            key[0][0] === "positions"
          );
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update position");
    },
  });
}
