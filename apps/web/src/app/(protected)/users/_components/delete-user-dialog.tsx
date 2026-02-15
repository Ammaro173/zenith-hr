"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
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
import { client } from "@/utils/orpc";

const BLOCKER_LABELS = {
  slotAssignments: "Active slot assignments",
  manpowerRequests: "Manpower requests",
  businessTrips: "Business trips",
  separations: "Separation requests",
  performanceReviews: "Performance reviews",
  importHistory: "Import history references",
} as const;

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

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const deleteDisabled =
    deleteMutation.isPending ||
    precheckQuery.isLoading ||
    (precheckQuery.data ? !precheckQuery.data.canDelete : false);

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
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteDisabled}
            onClick={handleDelete}
          >
            {deleteMutation.isPending
              ? "Deleting..."
              : precheckQuery.isLoading
                ? "Checking..."
                : "Delete User"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
