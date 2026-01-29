"use client";

import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import type { UserResponse } from "@zenith-hr/api/modules/users/users.schema";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Faceted,
  FacetedContent,
  FacetedTrigger,
} from "@/components/ui/faceted";
import { Input } from "@/components/ui/input";
import {
  PasswordInput,
  PasswordInputStrengthChecker,
} from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { ROLE_OPTIONS, USER_STATUS_OPTIONS } from "@/types/users";
import { client } from "@/utils/orpc";

// ============================================
// Types
// ============================================

type UserRole =
  | "REQUESTER"
  | "MANAGER"
  | "HR"
  | "FINANCE"
  | "CEO"
  | "IT"
  | "ADMIN";
type UserStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE";

export interface UserFormProps {
  mode: "create" | "edit";
  initialData?: UserResponse;
  onSubmit: (data: CreateUserFormData | UpdateUserFormData) => Promise<void>;
  onCancel: () => void;
  isPending?: boolean;
}

export interface CreateUserFormData {
  name: string;
  email: string;
  password: string;
  sapNo: string;
  role: UserRole;
  status: UserStatus;
  departmentId: string | null;
  reportsToManagerId: string | null;
}

export interface UpdateUserFormData {
  id: string;
  name?: string;
  email?: string;
  sapNo?: string;
  role?: UserRole;
  status?: UserStatus;
  departmentId?: string | null;
  reportsToManagerId?: string | null;
}

// ============================================
// Department Select Component
// ============================================

interface DepartmentSelectProps {
  value?: string | null;
  onChange: (val: string | null) => void;
  placeholder?: string;
}

function DepartmentSelect({
  value,
  onChange,
  placeholder = "Select department...",
}: DepartmentSelectProps) {
  const { data: departments, isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: () => client.users.getDepartments(),
  });

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <Loader2 className="mr-2 size-4 animate-spin" />
          <span className="text-muted-foreground">Loading...</span>
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select
      onValueChange={(val) => onChange(val === "__none__" ? null : val)}
      value={value ?? "__none__"}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">
          <span className="text-muted-foreground">None</span>
        </SelectItem>
        {departments?.map((dept) => (
          <SelectItem key={dept.id} value={dept.id}>
            {dept.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ============================================
// Manager Search Combobox Component
// ============================================

interface UserOption {
  id: string;
  name: string;
  sapNo: string;
  departmentName: string | null;
}

interface ManagerSearchComboboxProps {
  value?: string | null;
  onChange: (val: string | null) => void;
  placeholder?: string;
  excludeUserId?: string;
}

function ManagerSearchCombobox({
  value,
  onChange,
  placeholder = "Search for a manager...",
  excludeUserId,
}: ManagerSearchComboboxProps) {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users", "search", debouncedSearch],
    queryFn: () => client.users.search({ query: debouncedSearch }),
    enabled: debouncedSearch.length > 2,
  });

  // Filter out the current user being edited
  const filteredUsers = users?.filter((u) => u.id !== excludeUserId);

  // When value changes, if we have it in our results, update selectedUser
  useEffect(() => {
    if (value && users) {
      const user = users.find((u) => u.id === value);
      if (user) {
        setSelectedUser(user);
      }
    } else if (!value) {
      setSelectedUser(null);
    }
  }, [value, users]);

  return (
    <Faceted
      onValueChange={(val) => onChange(val as string | null)}
      value={value ?? undefined}
    >
      <FacetedTrigger asChild>
        <Button
          className="w-full justify-between font-normal"
          role="combobox"
          variant="outline"
        >
          {selectedUser ? (
            <span className="truncate">{selectedUser.name}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </FacetedTrigger>
      <FacetedContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0"
      >
        <CommandInput
          onValueChange={setSearch}
          placeholder="Search by name, SAP no, or email..."
          value={search}
        />
        <CommandList>
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading &&
            debouncedSearch.length > 0 &&
            debouncedSearch.length < 3 && (
              <CommandEmpty>Type at least 3 characters...</CommandEmpty>
            )}
          {!isLoading &&
            debouncedSearch.length >= 3 &&
            filteredUsers?.length === 0 && (
              <CommandEmpty>No employee found.</CommandEmpty>
            )}
          {/* Option to clear selection */}
          {value && (
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setSelectedUser(null);
                  onChange(null);
                }}
                value="__clear__"
              >
                <Check className="mr-2 h-4 w-4 opacity-0" />
                <span className="text-muted-foreground">Clear selection</span>
              </CommandItem>
            </CommandGroup>
          )}
          {!isLoading && filteredUsers && filteredUsers.length > 0 && (
            <CommandGroup>
              {filteredUsers.map((user) => (
                <CommandItem
                  key={user.id}
                  onSelect={() => {
                    setSelectedUser(user);
                    onChange(user.id);
                  }}
                  value={user.id}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === user.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col text-left">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {user.sapNo} • {user.departmentName ?? "No Department"}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </FacetedContent>
    </Faceted>
  );
}

// ============================================
// User Form Component
// ============================================

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
      name: initialData?.name ?? "",
      email: initialData?.email ?? "",
      password: "",
      sapNo: initialData?.sapNo ?? "",
      role: (initialData?.role as UserRole) ?? "REQUESTER",
      status: (initialData?.status as UserStatus) ?? "ACTIVE",
      departmentId: initialData?.departmentId ?? null,
      reportsToManagerId: initialData?.reportsToManagerId ?? null,
    },
    onSubmit: async ({ value }) => {
      if (isEditMode && initialData) {
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
        if (value.role !== initialData.role) {
          updateData.role = value.role;
        }
        if (value.status !== initialData.status) {
          updateData.status = value.status;
        }
        if (value.departmentId !== initialData.departmentId) {
          updateData.departmentId = value.departmentId;
        }
        if (value.reportsToManagerId !== initialData.reportsToManagerId) {
          updateData.reportsToManagerId = value.reportsToManagerId;
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

        {/* Role and Status in a row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Role Field */}
          <form.Field name="role">
            {(field) => (
              <FormField field={field} label="Role" required>
                <Select
                  onValueChange={(val) =>
                    field.handleChange(val as CreateUserFormData["role"])
                  }
                  value={field.state.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          </form.Field>

          {/* Status Field */}
          <form.Field name="status">
            {(field) => (
              <FormField field={field} label="Status" required>
                <Select
                  onValueChange={(val) =>
                    field.handleChange(val as CreateUserFormData["status"])
                  }
                  value={field.state.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          </form.Field>
        </div>

        {/* Department Field */}
        <form.Field name="departmentId">
          {(field) => (
            <FormField field={field} label="Department">
              <DepartmentSelect
                onChange={(val) => field.handleChange(val)}
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>

        {/* Manager Field */}
        <form.Field name="reportsToManagerId">
          {(field) => (
            <FormField field={field} label="Reports To (Manager)">
              <ManagerSearchCombobox
                excludeUserId={initialData?.id}
                onChange={(val) => field.handleChange(val)}
                placeholder="Search for a manager..."
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
