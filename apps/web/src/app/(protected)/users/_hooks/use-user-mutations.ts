import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/utils/orpc";

export function useCreateUser(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof client.users.create>[0]) =>
      client.users.create(input),
    onSuccess: () => {
      toast.success("User created successfully");
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
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
    onSuccess: () => {
      toast.success("User updated successfully");
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
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
    onSuccess: () => {
      toast.success("User deactivated successfully");
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
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
    onSuccess: () => {
      toast.success("User deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
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
    onSuccess: () => {
      toast.success("Session revoked successfully");
      queryClient.invalidateQueries({
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
    onSuccess: () => {
      toast.success("All sessions revoked successfully");
      queryClient.invalidateQueries({
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
    onSuccess: () => {
      toast.success("Password reset successfully");
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reset password");
    },
  });
}
