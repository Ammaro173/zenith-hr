"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  PositionForm,
  type PositionFormData,
} from "../../_components/position-form";
import { useCreatePosition } from "../../_components/use-position-mutations";

export function CreatePositionContent() {
  const router = useRouter();

  const createMutation = useCreatePosition({
    onSuccess: () => router.push("/positions" as Route),
  });

  const handleSubmit = async (data: PositionFormData) => {
    await createMutation.mutateAsync(data);
  };

  const handleCancel = () => {
    router.push("/positions" as Route);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <PositionForm
          isPending={createMutation.isPending}
          mode="create"
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />
      </CardContent>
    </Card>
  );
}
