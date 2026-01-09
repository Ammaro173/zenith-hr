"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createRequestSchema } from "@zenith-hr/api/modules/requests/requests.schema";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { client } from "@/utils/orpc";

type ManpowerRequestFormProps = {
  mode?: "page" | "sheet";
  onSuccess?: () => void;
  onCancel?: () => void;
};

type FormValues = z.input<typeof createRequestSchema>;

export function ManpowerRequestForm({
  mode = "page",
  onSuccess,
  onCancel,
}: ManpowerRequestFormProps) {
  const createMutation = useMutation({
    mutationFn: (data: FormValues) =>
      client.requests.create(
        data as Parameters<typeof client.requests.create>[0],
      ),
    onSuccess: () => {
      toast.success("Manpower request submitted successfully");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit request");
    },
  });

  const form = useForm({
    defaultValues: {
      requestType: "NEW_POSITION",
      isBudgeted: true,
      replacementForUserId: undefined,
      contractDuration: "FULL_TIME",
      justificationText: "",
      salaryRangeMin: 0,
      salaryRangeMax: 0,
      positionDetails: {
        title: "",
        department: "Finance & Accounting",
        description: "",
      },
      budgetDetails: {
        currency: "QAR",
        notes: "",
      },
    } as FormValues,
    validators: {
      onChange: createRequestSchema,
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutate(value);
    },
  });

  return (
    <form
      className={cn(
        "space-y-8",
        mode === "sheet" ? "px-1" : "mx-auto max-w-3xl",
      )}
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <div className="space-y-6">
        {/* Position Details */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-muted-foreground text-sm uppercase tracking-wider">
              Position Details
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <form.Field name="positionDetails.title">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>
                    Position Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. Senior Accountant"
                    value={field.state.value}
                  />
                  {field.state.meta.errors ? (
                    <em className="text-destructive text-xs">
                      {field.state.meta.errors.join(", ")}
                    </em>
                  ) : null}
                </div>
              )}
            </form.Field>

            <form.Field name="positionDetails.department">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Department</Label>
                  <Input
                    id={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>
          </div>

          <form.Field name="requestType">
            {(field) => (
              <div className="space-y-2">
                <Label>
                  Request Type <span className="text-destructive">*</span>
                </Label>
                <RadioGroup
                  className="grid grid-cols-1 gap-4 md:grid-cols-2"
                  onValueChange={(val) =>
                    field.handleChange(val as "NEW_POSITION" | "REPLACEMENT")
                  }
                  value={field.state.value}
                >
                  <Label
                    className={cn(
                      "relative flex cursor-pointer flex-col items-start gap-2 rounded-lg border p-4 font-normal transition-colors",
                      field.state.value === "NEW_POSITION"
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted",
                    )}
                    htmlFor="new-pos"
                  >
                    <div className="flex w-full items-center justify-between text-left">
                      <div className="font-semibold">New Position</div>
                      <RadioGroupItem id="new-pos" value="NEW_POSITION" />
                    </div>
                    <div className="text-left text-muted-foreground text-xs">
                      Create a completely new role
                    </div>
                  </Label>

                  <Label
                    className={cn(
                      "relative flex cursor-pointer flex-col items-start gap-2 rounded-lg border p-4 font-normal transition-colors",
                      field.state.value === "REPLACEMENT"
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted",
                    )}
                    htmlFor="replacement"
                  >
                    <div className="flex w-full items-center justify-between text-left">
                      <div className="font-semibold">Replacement</div>
                      <RadioGroupItem id="replacement" value="REPLACEMENT" />
                    </div>
                    <div className="text-left text-muted-foreground text-xs">
                      Replace an existing employee
                    </div>
                  </Label>
                </RadioGroup>
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.requestType}>
            {(requestType) => {
              if (requestType !== "REPLACEMENT") {
                return null;
              }
              return (
                <form.Field name="replacementForUserId">
                  {(field) => (
                    <div className="space-y-2 rounded-lg border border-dashed bg-muted/30 p-4">
                      <div className="mb-2 flex items-center gap-2 text-muted-foreground text-xs">
                        <Loader2 className="size-3" />
                        Only required if "Replacement" is selected
                      </div>
                      <Label htmlFor={field.name}>Select User to Replace</Label>
                      <UserSearchCombobox
                        onChange={field.handleChange}
                        value={field.state.value}
                      />
                      {field.state.meta.errors ? (
                        <em className="text-destructive text-xs">
                          {field.state.meta.errors.join(", ")}
                        </em>
                      ) : null}
                    </div>
                  )}
                </form.Field>
              );
            }}
          </form.Subscribe>
        </section>

        {/* Contract & Budget */}
        <section className="space-y-4 border-t pt-4">
          <h3 className="font-bold text-muted-foreground text-sm uppercase tracking-wider">
            Contract & Budget
          </h3>

          <form.Field name="isBudgeted">
            {(field) => (
              <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                <Checkbox
                  checked={field.state.value ?? false}
                  id={field.name}
                  onCheckedChange={(checked) => field.handleChange(!!checked)}
                />
                <div className="space-y-1 leading-none">
                  <Label className="font-semibold" htmlFor={field.name}>
                    Is this position budgeted?
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Uncheck if this request requires extraordinary budget
                    approval.
                  </p>
                </div>
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <form.Field name="contractDuration">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>
                    Contract Duration{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    onValueChange={(val) =>
                      field.handleChange(
                        val as "FULL_TIME" | "TEMPORARY" | "CONSULTANT",
                      )
                    }
                    value={field.state.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">
                        Unlimited / Permanent
                      </SelectItem>
                      <SelectItem value="TEMPORARY">Temporary</SelectItem>
                      <SelectItem value="CONSULTANT">Consultant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <div className="space-y-2">
              <Label>
                Monthly Salary Range (QAR){" "}
                <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <form.Field name="salaryRangeMin">
                  {(field) => (
                    <div className="flex-1">
                      <Input
                        onChange={(e) =>
                          field.handleChange(Number(e.target.value))
                        }
                        placeholder="Min"
                        type="number"
                        value={field.state.value || ""}
                      />
                    </div>
                  )}
                </form.Field>
                <span className="text-muted-foreground">-</span>
                <form.Field name="salaryRangeMax">
                  {(field) => (
                    <div className="flex-1">
                      <Input
                        onChange={(e) =>
                          field.handleChange(Number(e.target.value))
                        }
                        placeholder="Max"
                        type="number"
                        value={field.state.value || ""}
                      />
                    </div>
                  )}
                </form.Field>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Enter base salary only.
              </p>
            </div>
          </div>
        </section>

        {/* Justification */}
        <section className="space-y-4 border-t pt-4">
          <h3 className="font-bold text-muted-foreground text-sm uppercase tracking-wider">
            Justification
          </h3>

          <form.Field name="justificationText">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>
                  Reason for Request <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  className="min-h-[120px]"
                  id={field.name}
                  maxLength={500}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Please explain why this position is needed, impact of not hiring, and key responsibilities..."
                  value={field.state.value}
                />
                <div className="flex justify-end text-[10px] text-muted-foreground">
                  {field.state.value.length} / 500 characters
                </div>
                {field.state.meta.errors ? (
                  <em className="text-destructive text-xs">
                    {field.state.meta.errors.join(", ")}
                  </em>
                ) : null}
              </div>
            )}
          </form.Field>
        </section>
      </div>

      <div className="flex items-center justify-end gap-3 border-t pt-6">
        <Button onClick={onCancel} type="button" variant="outline">
          Cancel
        </Button>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <Button
              disabled={!canSubmit || isSubmitting || createMutation.isPending}
              type="submit"
            >
              {(isSubmitting || createMutation.isPending) && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Submit Request
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}

function UserSearchCombobox({
  value,
  onChange,
}: {
  value?: string;
  onChange: (val?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["users", "search", search],
    queryFn: () => client.users.search({ query: search }),
    enabled: search.length > 2,
  });

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="w-full justify-between"
          role="combobox"
          variant="outline"
        >
          {value
            ? (users?.find((u) => u.id === value)?.name ?? "User Selected")
            : "Search for an employee..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            onValueChange={setSearch}
            placeholder="Search by name, SAP no, or email..."
          />
          <CommandList>
            <CommandEmpty>
              {isLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!isLoading &&
                search.length < 3 &&
                "Type at least 3 characters..."}
              {!isLoading && search.length >= 3 && "No employee found."}
            </CommandEmpty>
            <CommandGroup>
              {users?.map((user) => (
                <CommandItem
                  key={user.id}
                  onSelect={() => {
                    onChange(user.id);
                    setOpen(false);
                  }}
                  value={user.id}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === user.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{user.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {user.sapNo} • {user.departmentName}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
