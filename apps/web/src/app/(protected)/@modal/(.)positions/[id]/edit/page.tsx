"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import {
  PositionForm,
  type PositionFormData,
  type PositionListItem,
} from "@/app/(protected)/positions/_components/position-form";
import { useUpdatePosition } from "@/app/(protected)/positions/_components/use-position-mutations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { client } from "@/utils/orpc";

export default function EditPositionModal() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const { data: position, isLoading } = useQuery({
    queryKey: ["positions", "getById", params.id],
    queryFn: () => client.positions.getById({ id: params.id }),
    enabled: !!params.id,
  });

  const updateMutation = useUpdatePosition({
    onSuccess: () => router.back(),
  });

  const handleSubmit = async (data: PositionFormData) => {
    if (!params.id) {
      return;
    }
    await updateMutation.mutateAsync({ ...data, id: params.id });
  };

  const handleClose = () => {
    router.back();
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!position) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          Position not found.
        </div>
      );
    }

    const initialData: PositionListItem = {
      id: position.id,
      code: position.code,
      name: position.name,
      description: position.description,
      responsibilities: position.responsibilities,
      grade: position.grade,
      role: position.role,
      departmentId: position.departmentId,
      departmentName: position.departmentName,
      reportsToPositionId: position.reportsToPositionId,
      reportsToPositionName: position.reportsToPositionName,
      active: position.active,
    };

    return (
      <PositionForm
        initialData={initialData}
        isPending={updateMutation.isPending}
        mode="edit"
        onCancel={handleClose}
        onSubmit={handleSubmit}
      />
    );
  };

  return (
    <Dialog onOpenChange={(open) => !open && handleClose()} open>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit Position</DialogTitle>
          <DialogDescription>
            Update position details and hierarchy.
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
