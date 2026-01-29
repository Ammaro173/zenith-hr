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
import { client } from "@/utils/orpc";
import {
  type CreateUserFormData,
  type UpdateUserFormData,
  UserForm,
} from "./user-form";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({
  open,
  onOpenChange,
}: CreateUserDialogProps) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateUserFormData) =>
      client.users.create({
        name: data.name,
        email: data.email,
        password: data.password,
        sapNo: data.sapNo,
        role: data.role,
        status: data.status,
        departmentId: data.departmentId,
        reportsToManagerId: data.reportsToManagerId,
      }),
    onSuccess: () => {
      toast.success("User created successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create user");
    },
  });

  const handleSubmit = async (
    data: CreateUserFormData | UpdateUserFormData,
  ) => {
    // In create mode, we always receive CreateUserFormData
    await createMutation.mutateAsync(data as CreateUserFormData);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Add a new user to the system. All required fields must be filled.
          </DialogDescription>
        </DialogHeader>
        <UserForm
          isPending={createMutation.isPending}
          mode="create"
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
