"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit,
  Key,
  Monitor,
  MoreHorizontal,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getRoleFromSessionUser } from "@/config/navigation";
import { authClient } from "@/lib/auth-client";
import type { UserListItem } from "@/types/users";
import { client } from "@/utils/orpc";
import { DeleteUserDialog } from "./delete-user-dialog";
import { EditUserDialog } from "./edit-user-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { UserSessionsDialog } from "./user-sessions-dialog";

const BLOCKER_LABELS = {
  slotAssignments: "Active slot assignments",
  manpowerRequests: "Manpower requests",
  businessTrips: "Business trips",
  separations: "Separation requests",
  performanceReviews: "Performance reviews",
  importHistory: "Import history references",
} as const;

function getDeactivateActionLabel(
  isPending: boolean,
  isChecking: boolean,
): string {
  if (isPending) {
    return "Deactivating...";
  }
  if (isChecking) {
    return "Checking...";
  }
  return "Deactivate";
}

interface UserRowActionsProps {
  user: UserListItem;
}

export function UserRowActions({ user }: UserRowActionsProps) {
  const { data: session } = authClient.useSession();
  const currentRole = getRoleFromSessionUser(session?.user);
  const queryClient = useQueryClient();

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSessionsDialog, setShowSessionsDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showDeactivateAlert, setShowDeactivateAlert] = useState(false);
  const [showActivateAlert, setShowActivateAlert] = useState(false);

  const canEdit = currentRole === "ADMIN" || currentRole === "HR";
  const canViewSessions = currentRole === "ADMIN";
  const canResetPassword = currentRole === "ADMIN" || currentRole === "HR";
  const canDeactivate = currentRole === "ADMIN" || currentRole === "HR";
  const canDelete = currentRole === "ADMIN";

  const isActive = user.status === "ACTIVE";
  const isSelf = session?.user?.id === user.id;

  const deactivateMutation = useMutation({
    mutationFn: () => client.users.deactivate({ id: user.id }),
    onSuccess: () => {
      toast.success("User deactivated successfully");
      // Invalidate all user-related queries (orpc uses [path, options] structure)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) && Array.isArray(key[0]) && key[0][0] === "users"
          );
        },
      });
      setShowDeactivateAlert(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to deactivate user");
    },
  });

  const deactivatePrecheckQuery = useQuery({
    queryKey: ["users", "offboarding-precheck", user.id, "deactivate"],
    queryFn: () => client.users.offboardingPrecheck({ id: user.id }),
    enabled: showDeactivateAlert,
  });

  const deactivateBlockerSummary = deactivatePrecheckQuery.data
    ? Object.entries(deactivatePrecheckQuery.data.counts)
        .filter(([, count]) => count > 0)
        .map(([key, count]) => {
          const label =
            BLOCKER_LABELS[key as keyof typeof BLOCKER_LABELS] ?? key;
          return `${label}: ${count}`;
        })
    : [];

  const deactivateDisabled =
    deactivateMutation.isPending ||
    deactivatePrecheckQuery.isLoading ||
    (deactivatePrecheckQuery.data
      ? !deactivatePrecheckQuery.data.canDeactivate
      : false);
  const deactivateActionLabel = getDeactivateActionLabel(
    deactivateMutation.isPending,
    deactivatePrecheckQuery.isLoading,
  );

  const activateMutation = useMutation({
    mutationFn: () => client.users.update({ id: user.id, status: "ACTIVE" }),
    onSuccess: () => {
      toast.success("User activated successfully");
      // Invalidate all user-related queries (orpc uses [path, options] structure)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) && Array.isArray(key[0]) && key[0][0] === "users"
          );
        },
      });
      setShowActivateAlert(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to activate user");
    },
  });

  if (!(canEdit || canViewSessions || canResetPassword || canDelete)) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canEdit && (
            <DropdownMenuItem onSelect={() => setShowEditDialog(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          {canViewSessions && (
            <DropdownMenuItem onSelect={() => setShowSessionsDialog(true)}>
              <Monitor className="mr-2 h-4 w-4" />
              View Sessions
            </DropdownMenuItem>
          )}
          {canResetPassword && (
            <DropdownMenuItem onSelect={() => setShowResetPasswordDialog(true)}>
              <Key className="mr-2 h-4 w-4" />
              Reset Password
            </DropdownMenuItem>
          )}
          {canDeactivate && !isSelf && (
            <>
              <DropdownMenuSeparator />
              {isActive ? (
                <DropdownMenuItem
                  className="text-warning focus:text-warning"
                  onSelect={() => setShowDeactivateAlert(true)}
                >
                  <PowerOff className="mr-2 h-4 w-4" />
                  Deactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="text-success focus:text-success"
                  onSelect={() => setShowActivateAlert(true)}
                >
                  <Power className="mr-2 h-4 w-4" />
                  Activate
                </DropdownMenuItem>
              )}
            </>
          )}
          {canDelete && !isSelf && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditUserDialog
        onOpenChange={setShowEditDialog}
        open={showEditDialog}
        userId={user.id}
      />

      <DeleteUserDialog
        onOpenChange={setShowDeleteDialog}
        open={showDeleteDialog}
        userId={user.id}
        userName={user.name}
      />

      <UserSessionsDialog
        onOpenChange={setShowSessionsDialog}
        open={showSessionsDialog}
        userId={user.id}
        userName={user.name}
      />

      <ResetPasswordDialog
        onOpenChange={setShowResetPasswordDialog}
        open={showResetPasswordDialog}
        userId={user.id}
        userName={user.name}
      />

      <AlertDialog
        onOpenChange={setShowDeactivateAlert}
        open={showDeactivateAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate{" "}
              <span className="font-semibold text-foreground">{user.name}</span>
              ? This will revoke all their active sessions.
              {deactivatePrecheckQuery.isLoading ? (
                <>
                  <br />
                  <br />
                  Checking offboarding blockers...
                </>
              ) : null}
              {deactivateBlockerSummary.length > 0 ? (
                <>
                  <br />
                  <br />
                  <span className="font-medium text-destructive">
                    Deactivation is blocked until these are resolved:
                  </span>
                  <ul className="mt-2 list-disc pl-5 text-destructive">
                    {deactivateBlockerSummary.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-warning text-warning-foreground hover:bg-warning/90"
              disabled={deactivateDisabled}
              onClick={(e) => {
                e.preventDefault();
                deactivateMutation.mutate();
              }}
            >
              {deactivateActionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog onOpenChange={setShowActivateAlert} open={showActivateAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to activate{" "}
              <span className="font-semibold text-foreground">{user.name}</span>
              ? They will be able to log in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-success text-success-foreground hover:bg-success/90"
              onClick={(e) => {
                e.preventDefault();
                activateMutation.mutate();
              }}
            >
              {activateMutation.isPending ? "Activating..." : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
