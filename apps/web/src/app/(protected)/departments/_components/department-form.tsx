"use client";

import { useForm } from "@tanstack/react-form";
import {
  createDepartmentDefaults,
  createDepartmentSchema,
} from "@zenith-hr/api/modules/departments/departments.schema";
import { Loader2 } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  CreateDepartmentFormData,
  DepartmentListItem,
  UpdateDepartmentFormData,
} from "@/types/departments";

export interface DepartmentFormProps {
  initialData?: DepartmentListItem;
  isPending?: boolean;
  mode: "create" | "edit";
  onCancel: () => void;
  onSubmit: (
    data: CreateDepartmentFormData | UpdateDepartmentFormData,
  ) => Promise<void>;
}

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
      ...createDepartmentDefaults,
      name: initialData?.name ?? "",
    },
    validators: {
      onChange: createDepartmentSchema,
    },
    onSubmit: async ({ value }) => {
      if (isEditMode && initialData) {
        // For edit mode, only send changed fields
        const updateData: UpdateDepartmentFormData = { id: initialData.id };
        if (value.name !== initialData.name) {
          updateData.name = value.name;
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
