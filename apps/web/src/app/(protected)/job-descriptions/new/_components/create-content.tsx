"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  JobDescriptionForm,
  type JobDescriptionFormData,
} from "../../_components/job-description-form";
import { useCreateJobDescription } from "../../_components/use-job-description-mutations";

export function CreateJobDescriptionContent() {
  const router = useRouter();

  const createMutation = useCreateJobDescription({
    onSuccess: () => router.push("/job-descriptions" as Route),
  });

  const handleSubmit = async (data: JobDescriptionFormData) => {
    await createMutation.mutateAsync(data);
  };

  const handleCancel = () => {
    router.push("/job-descriptions" as Route);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <JobDescriptionForm
          isPending={createMutation.isPending}
          mode="create"
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />
      </CardContent>
    </Card>
  );
}
