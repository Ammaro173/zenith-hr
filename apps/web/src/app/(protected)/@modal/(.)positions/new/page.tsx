"use client";

import { useRouter } from "next/navigation";
import {
  PositionForm,
  type PositionFormData,
} from "@/app/(protected)/positions/_components/position-form";
import { useCreatePosition } from "@/app/(protected)/positions/_components/use-position-mutations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function CreatePositionModal() {
  const router = useRouter();

  const createMutation = useCreatePosition({
    onSuccess: () => router.back(),
  });

  const handleSubmit = async (data: PositionFormData) => {
    await createMutation.mutateAsync(data);
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <Dialog onOpenChange={(open) => !open && handleClose()} open>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create Position</DialogTitle>
        </DialogHeader>
        <PositionForm
          isPending={createMutation.isPending}
          mode="create"
          onCancel={handleClose}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
