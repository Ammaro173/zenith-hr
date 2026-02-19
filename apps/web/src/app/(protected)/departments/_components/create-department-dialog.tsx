"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  CreateDepartmentFormData,
  UpdateDepartmentFormData,
} from "@/types/departments";
import { client } from "@/utils/orpc";
import { DepartmentForm } from "./department-form";

interface CreateDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateDepartmentDialog({
  open,
  onOpenChange,
}: CreateDepartmentDialogProps) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateDepartmentFormData) =>
      client.departments.create({
        name: data.name,
      }),
    onSuccess: () => {
      toast.success("Department created successfully");
      // Invalidate all department-related queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            Array.isArray(key[0]) &&
            key[0][0] === "departments"
          );
        },
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create department");
    },
  });

  const handleSubmit = async (
    data: CreateDepartmentFormData | UpdateDepartmentFormData,
  ) => {
    // In create mode, we always receive CreateDepartmentFormData
    await createMutation.mutateAsync(data as CreateDepartmentFormData);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Department</DialogTitle>
          <DialogDescription>
            Add a new department to the organization. All required fields must
            be filled.
          </DialogDescription>
        </DialogHeader>
        <DepartmentForm
          isPending={createMutation.isPending}
          mode="create"
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
