import { useForm } from "@tanstack/react-form";
import {
  type CreatePositionInput,
  createPositionDefaults,
  createPositionSchema,
} from "@zenith-hr/api/modules/positions/positions.schema";
import type { UserRole } from "@/types/users";

export type FormValues = CreatePositionInput;

export interface PositionListItem {
  active: boolean;
  code: string;
  departmentId: string | null;
  departmentName: string | null;
  description: string | null;
  grade: string | null;
  id: string;
  name: string;
  reportsToPositionId: string | null;
  reportsToPositionName: string | null;
  responsibilities: string | null;
  role: string;
}

export interface UsePositionFormProps {
  initialData?: PositionListItem;
  isPending?: boolean;
  mode: "create" | "edit";
  onCancel: () => void;
  onSubmit: (data: CreatePositionInput) => Promise<void>;
}

export function usePositionForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isPending = false,
}: UsePositionFormProps) {
  const defaultValues: CreatePositionInput = {
    ...createPositionDefaults,
    ...(initialData && {
      name: initialData.name ?? "",
      code: initialData.code ?? undefined,
      description: initialData.description ?? "",
      responsibilities: initialData.responsibilities ?? "",
      departmentId: initialData.departmentId ?? undefined,
      reportsToPositionId: initialData.reportsToPositionId ?? undefined,
      role: (initialData.role as UserRole) ?? "EMPLOYEE",
      grade: initialData.grade ?? "",
      active: initialData.active ?? true,
    }),
  };

  const form = useForm({
    defaultValues,
    validators: {
      onChange: createPositionSchema,
    },
    onSubmit: async ({ value }) => {
      await onSubmit({
        name: value.name,
        code: value.code || undefined,
        description: value.description || undefined,
        responsibilities: value.responsibilities || undefined,
        departmentId: value.departmentId || undefined,
        reportsToPositionId: value.reportsToPositionId ?? undefined,
        role: value.role,
        grade: value.grade || undefined,
        active: value.active,
      });
    },
  });

  const handleCancel = () => {
    onCancel();
  };

  return {
    form,
    handleCancel,
    isPending,
    isEditMode: mode === "edit",
  };
}
