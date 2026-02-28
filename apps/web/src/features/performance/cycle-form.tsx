"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CYCLE_STATUSES } from "@zenith-hr/api/modules/performance/performance.schema";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

interface CycleFormProps {
  cycleId?: string;
  initialValues?: Partial<CycleFormValues>;
  mode?: "page" | "sheet";
  onCancel?: () => void;
  onSuccess?: () => void;
}

interface CycleFormValues {
  description: string;
  endDate: Date | undefined;
  name: string;
  startDate: Date | undefined;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
}

const defaultValues: CycleFormValues = {
  name: "",
  description: "",
  startDate: undefined,
  endDate: undefined,
  status: "DRAFT",
};

export function CycleForm({
  mode = "page",
  onSuccess,
  onCancel,
  initialValues,
  cycleId,
}: CycleFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = !!cycleId;

  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      startDate: string;
      endDate: string;
      description?: string;
      status?: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
    }) => client.performance.createCycle(data),
    onSuccess: () => {
      toast.success("Performance cycle created");
      queryClient.invalidateQueries();
      onSuccess?.();
      if (!onSuccess) {
        router.push("/performance");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create cycle");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: {
      cycleId: string;
      name?: string;
      startDate?: string;
      endDate?: string;
      description?: string;
      status?: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
    }) => client.performance.updateCycle(data),
    onSuccess: () => {
      toast.success("Performance cycle updated");
      queryClient.invalidateQueries();
      onSuccess?.();
      if (!onSuccess) {
        router.push("/performance");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update cycle");
    },
  });

  const form = useForm({
    defaultValues: {
      ...defaultValues,
      ...initialValues,
      startDate: initialValues?.startDate
        ? new Date(initialValues.startDate)
        : undefined,
      endDate: initialValues?.endDate
        ? new Date(initialValues.endDate)
        : undefined,
    },
    onSubmit: async ({ value }) => {
      if (!(value.startDate && value.endDate)) {
        toast.error("Please select start and end dates");
        return;
      }

      if (isEditing && cycleId) {
        await updateMutation.mutateAsync({
          cycleId,
          name: value.name,
          description: value.description || undefined,
          startDate: value.startDate.toISOString(),
          endDate: value.endDate.toISOString(),
          status: value.status,
        });
      } else {
        await createMutation.mutateAsync({
          name: value.name,
          description: value.description || undefined,
          startDate: value.startDate.toISOString(),
          endDate: value.endDate.toISOString(),
          status: value.status,
        });
      }
    },
  });

  const mutation = isEditing ? updateMutation : createMutation;

  const handleCancel = () => {
    form.reset();
    onCancel?.();
    if (!onCancel) {
      router.back();
    }
  };

  return (
    <div
      className={cn(
        "space-y-6",
        mode === "sheet" ? "px-1" : "mx-auto max-w-2xl",
      )}
    >
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        {/* Cycle Name */}
        <form.Field name="name">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>
                Cycle Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="e.g., 2025 Annual Performance Review"
                value={field.state.value}
              />
              {field.state.meta.errors?.[0] && (
                <p className="text-destructive text-sm">
                  {field.state.meta.errors[0]}
                </p>
              )}
            </div>
          )}
        </form.Field>

        {/* Description */}
        <form.Field name="description">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Description</Label>
              <Textarea
                className="min-h-20"
                id={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Describe the goals and scope of this review cycle..."
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <form.Field name="startDate">
            {(field) => (
              <div className="space-y-2">
                <Label>
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.state.value && "text-muted-foreground",
                      )}
                      variant="outline"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.state.value ? (
                        format(field.state.value, "PPP")
                      ) : (
                        <span>Pick start date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      initialFocus
                      mode="single"
                      onSelect={(date) => {
                        if (date) {
                          field.handleChange(date);
                        }
                      }}
                      selected={field.state.value}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </form.Field>

          <form.Field name="endDate">
            {(field) => (
              <div className="space-y-2">
                <Label>
                  End Date <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.state.value && "text-muted-foreground",
                      )}
                      variant="outline"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.state.value ? (
                        format(field.state.value, "PPP")
                      ) : (
                        <span>Pick end date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      initialFocus
                      mode="single"
                      onSelect={(date) => {
                        if (date) {
                          field.handleChange(date);
                        }
                      }}
                      selected={field.state.value}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </form.Field>
        </div>

        {/* Status */}
        <form.Field name="status">
          {(field) => (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                onValueChange={(val) =>
                  field.handleChange(
                    val as "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED",
                  )
                }
                value={field.state.value}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {CYCLE_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t pt-6">
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
                disabled={!canSubmit || isSubmitting || mutation.isPending}
                type="submit"
              >
                {(isSubmitting || mutation.isPending) && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                {isEditing ? "Save Changes" : "Create Cycle"}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </div>
  );
}
