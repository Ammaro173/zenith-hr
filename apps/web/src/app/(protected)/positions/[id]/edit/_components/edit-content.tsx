"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { client } from "@/utils/orpc";
import {
  PositionForm,
  type PositionFormData,
  type PositionListItem,
} from "../../../_components/position-form";
import { useUpdatePosition } from "../../../_components/use-position-mutations";

interface EditPositionContentProps {
  id: string;
}

export function EditPositionContent({ id }: EditPositionContentProps) {
  const router = useRouter();

  const { data: position, isLoading } = useQuery({
    queryKey: ["positions", "getById", id],
    queryFn: () => client.positions.getById({ id }),
    enabled: !!id,
  });

  const updateMutation = useUpdatePosition({
    onSuccess: () => router.push("/positions" as Route),
  });

  const handleSubmit = async (data: PositionFormData) => {
    await updateMutation.mutateAsync({ ...data, id });
  };

  const handleCancel = () => {
    router.push("/positions" as Route);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!position) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          Position not found.
        </CardContent>
      </Card>
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
    <Card>
      <CardContent className="pt-6">
        <PositionForm
          initialData={initialData}
          isPending={updateMutation.isPending}
          mode="edit"
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />
      </CardContent>
    </Card>
  );
}
