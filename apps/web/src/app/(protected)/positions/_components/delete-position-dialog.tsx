"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
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
import type { PositionListItem } from "./position-form";

interface DeletePositionDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  position: PositionListItem | null;
}

export function DeletePositionDialog({
  open,
  onOpenChange,
  position,
}: DeletePositionDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.positions.delete({ id }),
    onSuccess: async () => {
      toast.success("Position deleted successfully");
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            Array.isArray(key[0]) &&
            key[0][0] === "positions"
          );
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete position");
    },
  });

  const handleDelete = () => {
    if (!position) {
      return;
    }
    deleteMutation.mutate(position.id);
  };

  if (!position) {
    return null;
  }

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            Delete Position
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{position.name}</span> (
              {position.code})?
            </span>
            <span className="block">
              Any users assigned to this position will need to be reassigned.
            </span>
            <span className="block">This action cannot be undone.</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteMutation.isPending}
            onClick={handleDelete}
          >
            {deleteMutation.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
