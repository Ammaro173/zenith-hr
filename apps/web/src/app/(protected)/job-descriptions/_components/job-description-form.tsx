"use client";

import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { DepartmentSelect } from "@/components/shared/department-select";
import { FormField } from "@/components/shared/form-field";
import { RoleSelect } from "@/components/shared/role-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { UserRole } from "@/types/users";

// ============================================
// Types
// ============================================

export interface JobDescriptionFormData {
  title: string;
  description: string;
  responsibilities: string | null;
  departmentId: string | null;
  assignedRole: UserRole;
}

export interface JobDescriptionListItem {
  id: string;
  title: string;
  description: string;
  responsibilities: string | null;
  departmentId: string | null;
  assignedRole: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobDescriptionFormProps {
  mode: "create" | "edit";
  initialData?: JobDescriptionListItem;
  onSubmit: (data: JobDescriptionFormData) => Promise<void>;
  onCancel: () => void;
  isPending?: boolean;
}

// ============================================
// Job Description Form Component
// ============================================

export function JobDescriptionForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isPending = false,
}: JobDescriptionFormProps) {
  const isEditMode = mode === "edit";

  const form = useForm({
    defaultValues: {
      title: initialData?.title ?? "",
      description: initialData?.description ?? "",
      responsibilities: initialData?.responsibilities ?? "",
      departmentId: initialData?.departmentId ?? null,
      assignedRole: initialData?.assignedRole ?? "EMPLOYEE",
    },
    onSubmit: async ({ value }) => {
      await onSubmit({
        title: value.title,
        description: value.description,
        responsibilities: value.responsibilities || null,
        departmentId: value.departmentId,
        assignedRole: value.assignedRole,
      });
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
      <p className="text-muted-foreground text-sm">
        These defaults are applied when this job description is linked to a
        position and that position is assigned to a user.
      </p>

      <div className="grid gap-4">
        {/* Title Field */}
        <form.Field name="title">
          {(field) => (
            <FormField field={field} label="Title" required>
              <Input
                id={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="e.g. Senior Software Engineer"
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>

        {/* Description Field */}
        <form.Field name="description">
          {(field) => (
            <FormField field={field} label="Description" required>
              <Textarea
                id={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Describe the role and how linked positions should be used..."
                rows={4}
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>

        {/* Responsibilities Field */}
        <form.Field name="responsibilities">
          {(field) => (
            <FormField field={field} label="Responsibilities">
              <Textarea
                id={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="List key responsibilities (optional)..."
                rows={3}
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>

        <form.Field name="assignedRole">
          {(field) => (
            <FormField field={field} label="Default Assigned Role" required>
              <RoleSelect
                onChange={(val) => field.handleChange(val as UserRole)}
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>

        <form.Field name="departmentId">
          {(field) => (
            <FormField field={field} label="Default Department (Optional)">
              <DepartmentSelect
                nullable
                onChange={(val) => field.handleChange(val)}
                placeholder="Select default department..."
                value={field.state.value}
                valueKey="id"
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
              {isEditMode ? "Update" : "Create"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
