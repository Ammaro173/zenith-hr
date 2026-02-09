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
import type { JobDescriptionListItem } from "./job-description-form";

interface DeleteJobDescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobDescription: JobDescriptionListItem | null;
}

export function DeleteJobDescriptionDialog({
  open,
  onOpenChange,
  jobDescription,
}: DeleteJobDescriptionDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.jobDescriptions.delete({ id }),
    onSuccess: () => {
      toast.success("Job description deleted successfully");
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            Array.isArray(key[0]) &&
            key[0][0] === "jobDescriptions"
          );
        },
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete job description");
    },
  });

  const handleDelete = () => {
    if (!jobDescription) {
      return;
    }
    deleteMutation.mutate(jobDescription.id);
  };

  if (!jobDescription) {
    return null;
  }

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            Delete Job Description
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{jobDescription.title}</span>?
            </p>
            <p>This action cannot be undone.</p>
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
