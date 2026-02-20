"use client";

import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { DepartmentSelect } from "@/components/shared/department-select";
import { FormField } from "@/components/shared/form-field";
import { PositionSearchCombobox } from "@/components/shared/position-search-combobox";
import { RoleSelect } from "@/components/shared/role-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { UserRole } from "@/types/users";

export interface JobDescriptionFormData {
  title: string;
  description: string;
  responsibilities: string | null;
  departmentId: string | null;
  reportsToPositionId: string | null;
  assignedRole: UserRole;
  grade: string | null;
  minSalary: number | null;
  maxSalary: number | null;
}

export interface JobDescriptionListItem {
  id: string;
  title: string;
  description: string;
  responsibilities: string | null;
  departmentId: string | null;
  departmentName: string | null;
  reportsToPositionId: string | null;
  reportsToPositionName: string | null;
  assignedRole: UserRole;
  grade: string | null;
  minSalary: number | null;
  maxSalary: number | null;
  active: boolean;
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
      reportsToPositionId: initialData?.reportsToPositionId ?? null,
      assignedRole: initialData?.assignedRole ?? "EMPLOYEE",
      grade: initialData?.grade ?? "",
      minSalary: initialData?.minSalary ?? null,
      maxSalary: initialData?.maxSalary ?? null,
    },
    onSubmit: async ({ value }) => {
      await onSubmit({
        title: value.title,
        description: value.description,
        responsibilities: value.responsibilities || null,
        departmentId: value.departmentId,
        reportsToPositionId: value.reportsToPositionId,
        assignedRole: value.assignedRole,
        grade: value.grade || null,
        minSalary: value.minSalary,
        maxSalary: value.maxSalary,
      });
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <div className="max-h-[50vh] overflow-y-auto pr-2">
        <div className="mt-4 grid gap-4">
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
          <form.Field name="description">
            {(field) => (
              <FormField field={field} label="Description" required>
                <Textarea
                  id={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Describe the role..."
                  rows={3}
                  value={field.state.value}
                />
              </FormField>
            )}
          </form.Field>
          <form.Field name="responsibilities">
            {(field) => (
              <FormField field={field} label="Responsibilities">
                <Textarea
                  id={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="List key responsibilities (optional)..."
                  rows={2}
                  value={field.state.value}
                />
              </FormField>
            )}
          </form.Field>
          <div className="grid grid-cols-2 gap-4">
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
            <form.Field name="grade">
              {(field) => (
                <FormField field={field} label="Grade / Level">
                  <Input
                    id={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. L1, Senior"
                    value={field.state.value}
                  />
                </FormField>
              )}
            </form.Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="departmentId">
              {(field) => (
                <FormField field={field} label="Department">
                  <DepartmentSelect
                    loadingLabel={initialData?.departmentName ?? undefined}
                    nullable
                    onChange={(val) => field.handleChange(val)}
                    placeholder="Select department..."
                    value={field.state.value}
                    valueKey="id"
                  />
                </FormField>
              )}
            </form.Field>
            <form.Field name="reportsToPositionId">
              {(field) => (
                <FormField field={field} label="Reports To Position">
                  <PositionSearchCombobox
                    nullable
                    onChange={(val) => field.handleChange(val ?? null)}
                    placeholder="Search position..."
                    value={field.state.value}
                  />
                </FormField>
              )}
            </form.Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="minSalary">
              {(field) => (
                <FormField field={field} label="Min Salary">
                  <Input
                    id={field.name}
                    min={0}
                    onBlur={field.handleBlur}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    placeholder="e.g. 5000"
                    type="number"
                    value={field.state.value ?? ""}
                  />
                </FormField>
              )}
            </form.Field>
            <form.Field name="maxSalary">
              {(field) => (
                <FormField field={field} label="Max Salary">
                  <Input
                    id={field.name}
                    min={0}
                    onBlur={field.handleBlur}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    placeholder="e.g. 15000"
                    type="number"
                    value={field.state.value ?? ""}
                  />
                </FormField>
              )}
            </form.Field>
          </div>
        </div>
      </div>
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
