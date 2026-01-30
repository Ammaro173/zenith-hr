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
import { client } from "@/utils/orpc";
import type { CreateUserFormData, UpdateUserFormData } from "./user-form";
import { UserForm } from "./user-form";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function EditUserDialog({
  open,
  onOpenChange,
  userId,
}: EditUserDialogProps) {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["users", userId],
    queryFn: () => client.users.getById({ id: userId }),
    enabled: open && !!userId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateUserFormData) =>
      client.users.update({
        id: data.id,
        name: data.name,
        email: data.email,
        sapNo: data.sapNo,
        role: data.role,
        status: data.status,
        departmentId: data.departmentId,
        reportsToManagerId: data.reportsToManagerId,
      }),
    onSuccess: () => {
      toast.success("User updated successfully");
      // Invalidate all user-related queries (orpc uses [path, options] structure)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) && Array.isArray(key[0]) && key[0][0] === "users"
          );
        },
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update user");
    },
  });

  const handleSubmit = async (
    data: CreateUserFormData | UpdateUserFormData,
  ) => {
    await updateMutation.mutateAsync(data as UpdateUserFormData);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!user) {
      return (
        <div className="py-12 text-center text-muted-foreground">
          User not found
        </div>
      );
    }

    return (
      <UserForm
        initialData={user}
        isPending={updateMutation.isPending}
        mode="edit"
        onCancel={handleCancel}
        onSubmit={handleSubmit}
      />
    );
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information. Only modified fields will be saved.
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
