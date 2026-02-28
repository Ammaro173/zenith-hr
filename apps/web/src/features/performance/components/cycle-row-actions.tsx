"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { client } from "@/utils/orpc";

interface CycleRowActionsProps {
  canManage: boolean;
  cycle: {
    id: string;
    name: string;
  };
}

export function CycleRowActions({ cycle, canManage }: CycleRowActionsProps) {
  const [showArchiveAlert, setShowArchiveAlert] = useState(false);
  const queryClient = useQueryClient();

  const archiveMutation = useMutation({
    mutationFn: () =>
      client.performance.updateCycle({
        cycleId: cycle.id,
        status: "ARCHIVED",
      }),
    onSuccess: () => {
      toast.success("Cycle archived successfully");
      queryClient.invalidateQueries();
      setShowArchiveAlert(false);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to archive cycle");
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/performance/cycles/${cycle.id}` as Route}>
              View Details
            </Link>
          </DropdownMenuItem>
          {canManage && (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/performance/cycles/${cycle.id}/edit` as Route}>
                  Edit Cycle
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setShowArchiveAlert(true)}
              >
                Archive
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog onOpenChange={setShowArchiveAlert} open={showArchiveAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive the performance cycle "{cycle.name}". It will no
              longer be active, but data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                archiveMutation.mutate();
              }}
            >
              {archiveMutation.isPending ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
