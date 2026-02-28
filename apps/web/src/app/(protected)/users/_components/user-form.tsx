"use client";

import { useForm } from "@tanstack/react-form";
import {
  createUserDefaults,
  createUserSchema,
  type UserResponse,
} from "@zenith-hr/api/modules/users/users.schema";
import { Loader2 } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { PositionCombobox } from "@/components/shared/position-combobox";
import { StatusSelect } from "@/components/shared/status-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PasswordInput,
  PasswordInputStrengthChecker,
} from "@/components/ui/password-input";

type UserStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE";

export interface UserFormProps {
  initialData?: UserResponse;
  isPending?: boolean;
  mode: "create" | "edit";
  onCancel: () => void;
  onSubmit: (data: CreateUserFormData | UpdateUserFormData) => Promise<void>;
}

export interface CreateUserFormData {
  email: string;
  name: string;
  password: string;
  positionId: string;
  sapNo: string;
  status: UserStatus;
}

export interface UpdateUserFormData {
  email?: string;
  id: string;
  name?: string;
  positionId?: string;
  sapNo?: string;
  status?: UserStatus;
}

export function UserForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isPending = false,
}: UserFormProps) {
  const isEditMode = mode === "edit";

  const form = useForm({
    defaultValues: {
      ...createUserDefaults,
      name: initialData?.name ?? "",
      email: initialData?.email ?? "",
      sapNo: initialData?.sapNo ?? "",
      status: (initialData?.status as UserStatus) ?? "ACTIVE",
      positionId: initialData?.positionId ?? "",
    },
    validators: {
      onChange: createUserSchema,
    },
    onSubmit: async ({ value }) => {
      if (isEditMode && initialData) {
        //TODO need a better way to do this
        // For edit mode, only send changed fields
        const updateData: UpdateUserFormData = { id: initialData.id };
        if (value.name !== initialData.name) {
          updateData.name = value.name;
        }
        if (value.email !== initialData.email) {
          updateData.email = value.email;
        }
        if (value.sapNo !== initialData.sapNo) {
          updateData.sapNo = value.sapNo;
        }
        if (value.status !== initialData.status) {
          updateData.status = value.status;
        }
        if (value.positionId) {
          updateData.positionId = value.positionId;
        }

        await onSubmit(updateData);
      } else {
        // For create mode, send all fields
        await onSubmit(value as CreateUserFormData);
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
            <FormField field={field} label="Name" required>
              <Input
                id={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Enter full name"
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>

        {/* Email Field */}
        <form.Field name="email">
          {(field) => (
            <FormField field={field} label="Email" required>
              <Input
                autoComplete="off"
                id={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Enter email address"
                type="email"
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>

        {/* Password Field - Only shown in create mode */}
        {!isEditMode && (
          <form.Field name="password">
            {(field) => (
              <FormField field={field} label="Password" required>
                <PasswordInput
                  autoComplete="new-password"
                  id={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Enter password (min 8 characters)"
                  value={field.state.value}
                >
                  <PasswordInputStrengthChecker />
                </PasswordInput>
              </FormField>
            )}
          </form.Field>
        )}

        {/* SAP Number Field */}
        <form.Field name="sapNo">
          {(field) => (
            <FormField field={field} label="SAP Number" required>
              <Input
                id={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Enter SAP number"
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>

        {/* Status Field */}
        <form.Field name="status">
          {(field) => (
            <FormField field={field} label="Status" required>
              <StatusSelect
                onChange={(val) =>
                  field.handleChange(val as CreateUserFormData["status"])
                }
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>

        {/* Position Field */}
        <form.Field name="positionId">
          {(field) => (
            <FormField field={field} label="Position" required>
              <PositionCombobox
                onChange={(val) => field.handleChange(val ?? "")}
                placeholder="Search and select position"
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
              {isEditMode ? "Update User" : "Create User"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
