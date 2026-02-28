"use client";

import { Edit, MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
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
import type { DepartmentListItem } from "@/types/departments";
import { DeleteDepartmentDialog } from "./delete-department-dialog";
import { EditDepartmentDialog } from "./edit-department-dialog";

interface DepartmentRowActionsProps {
  department: DepartmentListItem;
}

export function DepartmentRowActions({
  department,
}: DepartmentRowActionsProps) {
  const { data: session } = authClient.useSession();
  const currentRole = getRoleFromSessionUser(session?.user);

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const canEdit = currentRole === "ADMIN" || currentRole === "HOD_HR";
  const canDelete = currentRole === "ADMIN" || currentRole === "HOD_HR";

  if (!(canEdit || canDelete)) {
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
          {canDelete && (
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

      <EditDepartmentDialog
        departmentId={department.id}
        onOpenChange={setShowEditDialog}
        open={showEditDialog}
      />

      <DeleteDepartmentDialog
        departmentId={department.id}
        departmentName={department.name}
        onOpenChange={setShowDeleteDialog}
        open={showDeleteDialog}
      />
    </>
  );
}
