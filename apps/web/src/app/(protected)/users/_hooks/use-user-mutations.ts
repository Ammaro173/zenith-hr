import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/utils/orpc";

export function useCreateUser(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof client.users.create>[0]) =>
      client.users.create(input),
    onSuccess: async () => {
      toast.success("User created successfully");
      await queryClient.invalidateQueries({ queryKey: ["users", "list"] });
      // Invalidate org chart queries to reflect new user
      await queryClient.invalidateQueries({
        queryKey: ["users", "getHierarchy"],
      });
      // Invalidate dashboard
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create user");
    },
  });
}

export function useUpdateUser(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof client.users.update>[0]) =>
      client.users.update(input),
    onSuccess: async () => {
      toast.success("User updated successfully");
      // Invalidate user list
      await queryClient.invalidateQueries({ queryKey: ["users", "list"] });
      // Invalidate org chart queries to reflect position changes
      await queryClient.invalidateQueries({
        queryKey: ["users", "getHierarchy"],
      });
      // Invalidate approval-related queries
      await queryClient.invalidateQueries({ queryKey: ["requests"] });
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      await queryClient.invalidateQueries({ queryKey: ["approvals"] });
      // Invalidate dashboard
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update user");
    },
  });
}

export function useDeactivateUser(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => client.users.deactivate({ id: userId }),
    onSuccess: async () => {
      toast.success("User deactivated successfully");
      await queryClient.invalidateQueries({ queryKey: ["users", "list"] });
      // Invalidate org chart queries to reflect user status change
      await queryClient.invalidateQueries({
        queryKey: ["users", "getHierarchy"],
      });
      // Invalidate approval-related queries
      await queryClient.invalidateQueries({ queryKey: ["requests"] });
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      await queryClient.invalidateQueries({ queryKey: ["approvals"] });
      // Invalidate dashboard
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to deactivate user");
    },
  });
}

export function useDeleteUser(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => client.users.delete({ id: userId }),
    onSuccess: async () => {
      toast.success("User deleted successfully");
      await queryClient.invalidateQueries({ queryKey: ["users", "list"] });
      // Invalidate org chart queries to reflect user removal
      await queryClient.invalidateQueries({
        queryKey: ["users", "getHierarchy"],
      });
      // Invalidate approval-related queries
      await queryClient.invalidateQueries({ queryKey: ["requests"] });
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      await queryClient.invalidateQueries({ queryKey: ["approvals"] });
      // Invalidate dashboard
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete user");
    },
  });
}

export function useRevokeSession(
  userId: string,
  options?: { onSuccess?: () => void },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) =>
      client.users.revokeSession({ sessionId }),
    onSuccess: async () => {
      toast.success("Session revoked successfully");
      await queryClient.invalidateQueries({
        queryKey: ["users", userId, "sessions"],
      });
      options?.onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke session");
    },
  });
}

export function useRevokeAllSessions(
  userId: string,
  options?: { onSuccess?: () => void },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => client.users.revokeAllSessions({ userId }),
    onSuccess: async () => {
      toast.success("All sessions revoked successfully");
      await queryClient.invalidateQueries({
        queryKey: ["users", userId, "sessions"],
      });
      options?.onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke all sessions");
    },
  });
}

export function useResetPassword(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { userId: string; newPassword: string }) =>
      client.users.resetPassword(input),
    onSuccess: async () => {
      toast.success("Password reset successfully");
      await queryClient.invalidateQueries({ queryKey: ["users", "list"] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reset password");
    },
  });
}
