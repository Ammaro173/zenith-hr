"use client";

import { useRouter } from "next/navigation";
import {
  JobDescriptionForm,
  type JobDescriptionFormData,
} from "@/app/(protected)/job-descriptions/_components/job-description-form";
import { useCreateJobDescription } from "@/app/(protected)/job-descriptions/_components/use-job-description-mutations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function CreateJobDescriptionModal() {
  const router = useRouter();

  const createMutation = useCreateJobDescription({
    onSuccess: () => router.back(),
  });

  const handleSubmit = async (data: JobDescriptionFormData) => {
    await createMutation.mutateAsync(data);
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <Dialog onOpenChange={(open) => !open && handleClose()} open>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create Job Description</DialogTitle>
        </DialogHeader>
        <JobDescriptionForm
          isPending={createMutation.isPending}
          mode="create"
          onCancel={handleClose}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
