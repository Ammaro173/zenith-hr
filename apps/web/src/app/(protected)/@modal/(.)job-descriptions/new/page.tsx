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
  DialogDescription,
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Job Description</DialogTitle>
          <DialogDescription>
            Create a reusable job description template for manpower requests.
          </DialogDescription>
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
