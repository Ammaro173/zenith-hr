"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import {
  JobDescriptionForm,
  type JobDescriptionFormData,
  type JobDescriptionListItem,
} from "@/app/(protected)/job-descriptions/_components/job-description-form";
import { useUpdateJobDescription } from "@/app/(protected)/job-descriptions/_components/use-job-description-mutations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { client } from "@/utils/orpc";

export default function EditJobDescriptionModal() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const { data: jobDescription, isLoading } = useQuery({
    queryKey: ["jobDescriptions", "getById", params.id],
    queryFn: () => client.jobDescriptions.getById({ id: params.id }),
    enabled: !!params.id,
  });

  const updateMutation = useUpdateJobDescription({
    onSuccess: () => router.back(),
  });

  const handleSubmit = async (data: JobDescriptionFormData) => {
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

    if (!jobDescription) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          Job description not found.
        </div>
      );
    }

    return (
      <JobDescriptionForm
        initialData={jobDescription as JobDescriptionListItem}
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
          <DialogTitle>Edit Job Description</DialogTitle>
          <DialogDescription>
            Update default role and department behavior for linked positions.
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
