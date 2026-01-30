"use client";

import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
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
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import type {
  CreateDepartmentFormData,
  DepartmentListItem,
  UpdateDepartmentFormData,
} from "@/types/departments";
import { client } from "@/utils/orpc";

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
// Head of Department Search Combobox Component
// ============================================

interface UserOption {
  id: string;
  name: string;
  sapNo: string;
  departmentName: string | null;
}

interface HeadOfDepartmentComboboxProps {
  value?: string | null;
  onChange: (val: string | null) => void;
  placeholder?: string;
}

function HeadOfDepartmentCombobox({
  value,
  onChange,
  placeholder = "Search for a user...",
}: HeadOfDepartmentComboboxProps) {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users", "search", debouncedSearch],
    queryFn: () => client.users.search({ query: debouncedSearch }),
    enabled: debouncedSearch.length > 2,
  });

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
          {!isLoading && debouncedSearch.length >= 3 && users?.length === 0 && (
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
          {!isLoading && users && users.length > 0 && (
            <CommandGroup>
              {users.map((user) => (
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
      headOfDepartmentId: initialData?.headOfDepartmentId ?? null,
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
        if (value.headOfDepartmentId !== initialData.headOfDepartmentId) {
          updateData.headOfDepartmentId = value.headOfDepartmentId;
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

        {/* Head of Department Field */}
        <form.Field name="headOfDepartmentId">
          {(field) => (
            <FormField field={field} label="Head of Department">
              <HeadOfDepartmentCombobox
                onChange={(val) => field.handleChange(val)}
                placeholder="Search for head of department..."
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
