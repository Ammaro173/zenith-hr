"use client";

import { Loader2 } from "lucide-react";
import { DepartmentSelect } from "@/components/shared/department-select";
import { FormField } from "@/components/shared/form-field";
import { PositionSearchCombobox } from "@/components/shared/position-search-combobox";
import { RoleSelect } from "@/components/shared/role-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { UserRole } from "@/types/users";
import {
  type FormValues,
  // biome-ignore lint/style/noExportedImports: //TODO fix later
  type PositionListItem,
  usePositionForm,
} from "../_hooks/use-position-form";

export type PositionFormData = FormValues;
export type { PositionListItem };

export interface PositionFormProps {
  initialData?: PositionListItem;
  isPending?: boolean;
  mode: "create" | "edit";
  onCancel: () => void;
  onSubmit: (data: PositionFormData) => Promise<void>;
}

export function PositionForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isPending = false,
}: PositionFormProps) {
  const {
    form,
    handleCancel,
    isPending: isFormPending,
    isEditMode,
  } = usePositionForm({
    mode,
    initialData,
    onSubmit,
    onCancel,
    isPending,
  });

  const pending = isFormPending || isPending;

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
          <form.Field name="name">
            {(field) => (
              <FormField field={field} label="Name" required>
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
          {/* Code field hidden (create + edit)
          {isEditMode && (
            <form.Field name="code">
              {(field) => (
                <FormField field={field} label="Code">
                  <Input
                    id={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) =>
                      field.handleChange(e.target.value || undefined)
                    }
                    placeholder="e.g. POS-001"
                    value={field.state.value ?? ""}
                  />
                </FormField>
              )}
            </form.Field>
          )}
          */}
          <form.Field name="description">
            {(field) => (
              <FormField field={field} label="Description">
                <Textarea
                  id={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Describe the role..."
                  rows={3}
                  value={field.state.value ?? ""}
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
                  value={field.state.value ?? ""}
                />
              </FormField>
            )}
          </form.Field>
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="role">
              {(field) => (
                <FormField field={field} label="Hierarchy Level" required>
                  <RoleSelect
                    onChange={(val) =>
                      field.handleChange(val as Exclude<UserRole, "ADMIN">)
                    }
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
                    value={field.state.value ?? ""}
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
                    onChange={(val) => field.handleChange(val ?? undefined)}
                    placeholder="Select department..."
                    value={field.state.value}
                    valueKey="id"
                  />
                </FormField>
              )}
            </form.Field>
            <form.Field name="reportsToPositionId">
              {(field) => (
                <FormField
                  field={field}
                  label="Reports To Position"
                  required={form.getFieldValue("role") !== "CEO"}
                >
                  <PositionSearchCombobox
                    onChange={(val) => field.handleChange(val)}
                    placeholder="Search position..."
                    value={field.state.value}
                  />
                </FormField>
              )}
            </form.Field>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <Button onClick={handleCancel} type="button" variant="outline">
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
              disabled={!canSubmit || isSubmitting || pending}
              type="submit"
            >
              {(isSubmitting || pending) && (
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
