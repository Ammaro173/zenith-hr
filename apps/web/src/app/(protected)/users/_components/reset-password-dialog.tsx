"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  PasswordInput,
  PasswordInputStrengthChecker,
} from "@/components/ui/password-input";
import { client } from "@/utils/orpc";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

const MIN_PASSWORD_LENGTH = 8;

export function ResetPasswordDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: ResetPasswordDialogProps) {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const resetPasswordMutation = useMutation({
    mutationFn: () =>
      client.users.resetPassword({
        userId,
        newPassword: password,
      }),
    onSuccess: () => {
      toast.success("Password reset successfully");
      // Invalidate all user-related queries (orpc uses [path, options] structure)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) && Array.isArray(key[0]) && key[0][0] === "users"
          );
        },
      });
      handleClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reset password");
    },
  });

  const handleClose = () => {
    setPassword("");
    setConfirmPassword("");
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      );
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    resetPasswordMutation.mutate();
  };

  const isValid =
    password.length >= MIN_PASSWORD_LENGTH && password === confirmPassword;

  return (
    <Dialog onOpenChange={handleClose} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Set a new password for{" "}
            <span className="font-semibold text-foreground">{userName}</span>.
            This will revoke all active sessions.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <PasswordInput
              id="new-password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password (min 8 characters)"
              value={password}
            >
              <PasswordInputStrengthChecker />
            </PasswordInput>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <PasswordInput
              id="confirm-password"
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              value={confirmPassword}
            />
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="text-destructive text-sm">Passwords do not match</p>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              disabled={resetPasswordMutation.isPending}
              onClick={handleClose}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!isValid || resetPasswordMutation.isPending}
              type="submit"
            >
              {resetPasswordMutation.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Reset Password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
