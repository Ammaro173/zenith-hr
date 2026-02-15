"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { client } from "@/utils/orpc";

const BLOCKER_LABELS = {
  slotAssignments: "Active slot assignments",
  manpowerRequests: "Manpower requests",
  businessTrips: "Business trips",
  separations: "Separation requests",
  performanceReviews: "Performance reviews",
  importHistory: "Import history references",
} as const;

function getDeleteActionLabel(isPending: boolean, isChecking: boolean): string {
  if (isPending) {
    return "Deleting...";
  }
  if (isChecking) {
    return "Checking...";
  }
  return "Delete User";
}

function getForceActionLabel(isPending: boolean): string {
  if (isPending) {
    return "Force deleting...";
  }
  return "Force Delete";
}

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export function DeleteUserDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: DeleteUserDialogProps) {
  const queryClient = useQueryClient();
  const [forceAcknowledge, setForceAcknowledge] = useState(false);

  useEffect(() => {
    if (!open) {
      setForceAcknowledge(false);
    }
  }, [open]);

  const precheckQuery = useQuery({
    queryKey: ["users", "offboarding-precheck", userId],
    queryFn: () => client.users.offboardingPrecheck({ id: userId }),
    enabled: open,
  });

  const blockerSummary = precheckQuery.data
    ? Object.entries(precheckQuery.data.counts)
        .filter(([, count]) => count > 0)
        .map(([key, count]) => {
          const label =
            BLOCKER_LABELS[key as keyof typeof BLOCKER_LABELS] ?? key;
          return `${label}: ${count}`;
        })
    : [];

  const deleteMutation = useMutation({
    mutationFn: () => client.users.delete({ id: userId }),
    onSuccess: () => {
      toast.success("User deleted successfully");
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
      toast.error(error.message || "Failed to delete user");
    },
  });

  const forceDeleteMutation = useMutation({
    mutationFn: () => client.users.forceDelete({ id: userId }),
    onSuccess: () => {
      toast.success("User force-deleted successfully");
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
      toast.error(error.message || "Failed to force delete user");
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const handleForceDelete = () => {
    forceDeleteMutation.mutate();
  };

  const actionLabel = getDeleteActionLabel(
    deleteMutation.isPending,
    precheckQuery.isLoading,
  );

  const deleteDisabled =
    deleteMutation.isPending ||
    forceDeleteMutation.isPending ||
    precheckQuery.isLoading ||
    (precheckQuery.data ? !precheckQuery.data.canDelete : false);

  const showForceDelete =
    !!precheckQuery.data &&
    !precheckQuery.data.canDelete &&
    !precheckQuery.isLoading;
  const forceDeleteDisabled =
    forceDeleteMutation.isPending ||
    deleteMutation.isPending ||
    !forceAcknowledge;
  const forceActionLabel = getForceActionLabel(forceDeleteMutation.isPending);

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="size-5 text-destructive" />
            </div>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            Are you sure you want to permanently delete{" "}
            <span className="font-semibold text-foreground">{userName}</span>?
            This action cannot be undone and will remove all associated data
            including sessions and accounts.
            {precheckQuery.isLoading ? (
              <>
                <br />
                <br />
                Checking offboarding blockers...
              </>
            ) : null}
            {blockerSummary.length > 0 ? (
              <>
                <br />
                <br />
                <span className="font-medium text-destructive">
                  Delete is blocked until these are resolved:
                </span>
                <ul className="mt-2 list-disc pl-5 text-destructive">
                  {blockerSummary.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {showForceDelete ? (
              <>
                <br />
                <br />
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-destructive text-sm">
                    Force delete bypasses operational blockers and can remove
                    historical links.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Checkbox
                      checked={forceAcknowledge}
                      id="force-delete-ack"
                      onCheckedChange={(checked) =>
                        setForceAcknowledge(Boolean(checked))
                      }
                    />
                    <label className="text-sm" htmlFor="force-delete-ack">
                      I understand this is destructive and irreversible
                    </label>
                  </div>
                </div>
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={deleteMutation.isPending || forceDeleteMutation.isPending}
          >
            Cancel
          </AlertDialogCancel>
          {showForceDelete ? (
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={forceDeleteDisabled}
              onClick={handleForceDelete}
            >
              {forceActionLabel}
            </AlertDialogAction>
          ) : null}
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteDisabled}
            onClick={handleDelete}
          >
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
