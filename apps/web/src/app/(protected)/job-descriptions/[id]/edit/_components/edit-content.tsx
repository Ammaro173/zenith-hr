"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { client } from "@/utils/orpc";
import {
  JobDescriptionForm,
  type JobDescriptionFormData,
  type JobDescriptionListItem,
} from "../../../_components/job-description-form";
import { useUpdateJobDescription } from "../../../_components/use-job-description-mutations";

interface EditJobDescriptionContentProps {
  id: string;
}

export function EditJobDescriptionContent({
  id,
}: EditJobDescriptionContentProps) {
  const router = useRouter();

  const { data: jobDescription, isLoading } = useQuery({
    queryKey: ["jobDescriptions", "getById", id],
    queryFn: () => client.jobDescriptions.getById({ id }),
    enabled: !!id,
  });

  const updateMutation = useUpdateJobDescription({
    onSuccess: () => router.push("/job-descriptions" as Route),
  });

  const handleSubmit = async (data: JobDescriptionFormData) => {
    await updateMutation.mutateAsync({ ...data, id });
  };

  const handleCancel = () => {
    router.push("/job-descriptions" as Route);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!jobDescription) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          Job description not found.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <JobDescriptionForm
          initialData={jobDescription as JobDescriptionListItem}
          isPending={updateMutation.isPending}
          mode="edit"
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />
      </CardContent>
    </Card>
  );
}
