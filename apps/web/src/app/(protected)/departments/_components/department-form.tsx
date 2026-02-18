"use client";

import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  CreateDepartmentFormData,
  DepartmentListItem,
  UpdateDepartmentFormData,
} from "@/types/departments";

// ============================================
// Types
// ============================================

export interface DepartmentFormProps {
  mode: "create" | "edit";
  initialData?: DepartmentListItem;
  onSubmit: (
    data: CreateDepartmentFormData | UpdateDepartmentFormData,
  ) => Promise<void>;
  onCancel: () => void;
  isPending?: boolean;
}

// ============================================
// Department Form Component
// ============================================

export function DepartmentForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isPending = false,
}: DepartmentFormProps) {
  const isEditMode = mode === "edit";

  const form = useForm({
    defaultValues: {
      name: initialData?.name ?? "",
      costCenterCode: initialData?.costCenterCode ?? "",
    },
    onSubmit: async ({ value }) => {
      if (isEditMode && initialData) {
        // For edit mode, only send changed fields
        const updateData: UpdateDepartmentFormData = { id: initialData.id };
        if (value.name !== initialData.name) {
          updateData.name = value.name;
        }
        if (value.costCenterCode !== initialData.costCenterCode) {
          updateData.costCenterCode = value.costCenterCode;
        }
        await onSubmit(updateData);
      } else {
        // For create mode, send all fields
        await onSubmit(value as CreateDepartmentFormData);
      }
    },
  });

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <div className="grid gap-4">
        {/* Name Field */}
        <form.Field name="name">
          {(field) => (
            <FormField field={field} label="Department Name" required>
              <Input
                id={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Enter department name"
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>

        {/* Cost Center Code Field */}
        <form.Field name="costCenterCode">
          {(field) => (
            <FormField field={field} label="Cost Center Code" required>
              <Input
                id={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Enter cost center code"
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <Button onClick={onCancel} type="button" variant="outline">
          Cancel
        </Button>
        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button
              disabled={!canSubmit || isSubmitting || isPending}
              type="submit"
            >
              {(isSubmitting || isPending) && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              {isEditMode ? "Update Department" : "Create Department"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
