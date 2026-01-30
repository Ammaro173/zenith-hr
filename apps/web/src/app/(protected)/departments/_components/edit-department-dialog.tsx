"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
  DepartmentListItem,
  UpdateDepartmentFormData,
} from "@/types/departments";
import { client } from "@/utils/orpc";
import { DepartmentForm } from "./department-form";

interface EditDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: string;
}

export function EditDepartmentDialog({
  open,
  onOpenChange,
  departmentId,
}: EditDepartmentDialogProps) {
  const queryClient = useQueryClient();

  // Fetch department data
  const { data: department, isLoading } = useQuery({
    queryKey: ["departments", "getById", departmentId],
    queryFn: () => client.departments.getById({ id: departmentId }),
    enabled: open && !!departmentId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateDepartmentFormData) =>
      client.departments.update({
        id: data.id,
        name: data.name,
        costCenterCode: data.costCenterCode,
        headOfDepartmentId: data.headOfDepartmentId,
      }),
    onSuccess: () => {
      toast.success("Department updated successfully");
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
      toast.error(error.message || "Failed to update department");
    },
  });

  const handleSubmit = async (
    data: CreateDepartmentFormData | UpdateDepartmentFormData,
  ) => {
    // In edit mode, we always receive UpdateDepartmentFormData
    await updateMutation.mutateAsync(data as UpdateDepartmentFormData);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!department) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          Department not found
        </div>
      );
    }

    return (
      <DepartmentForm
        initialData={department as DepartmentListItem}
        isPending={updateMutation.isPending}
        mode="edit"
        onCancel={handleCancel}
        onSubmit={handleSubmit}
      />
    );
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Department</DialogTitle>
          <DialogDescription>
            Update department information. Only changed fields will be saved.
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
