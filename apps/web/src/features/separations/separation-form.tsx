"use client";

import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useSeparationForm } from "./use-separation-form";

interface SeparationFormProps {
  mode?: "page" | "sheet";
  onCancel?: () => void;
  onSuccess?: () => void;
}

export function SeparationForm({
  mode = "page",
  onSuccess,
  onCancel,
}: SeparationFormProps) {
  const { form, isPending, handleCancel } = useSeparationForm({
    onSuccess,
    onCancel,
  });

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
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <form.Field name="type">
              {(field) => (
                <FormField field={field} label="Type" required>
                  <Select
                    onValueChange={(val) =>
                      field.handleChange(val as typeof field.state.value)
                    }
                    value={field.state.value}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RESIGNATION">Resignation</SelectItem>
                      <SelectItem value="TERMINATION">Termination</SelectItem>
                      <SelectItem value="RETIREMENT">Retirement</SelectItem>
                      <SelectItem value="END_OF_CONTRACT">
                        End of Contract
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </form.Field>

            <form.Field name="lastWorkingDay">
              {(field) => (
                <FormField field={field} label="Last Working Day" required>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.state.value && "text-muted-foreground",
                        )}
                        id={field.name}
                        type="button"
                        variant="outline"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.state.value ? (
                          format(field.state.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
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
                </FormField>
              )}
            </form.Field>

            <form.Field name="reason">
              {(field) => (
                <FormField
                  description="Provide context so approvals and departments can act fast."
                  field={field}
                  label="Reason"
                  required
                >
                  <Textarea
                    className="min-h-28"
                    id={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g., resignation due to relocation..."
                    value={field.state.value}
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field name="noticePeriodWaived">
              {(field) => (
                <FormField field={field} label="Notice period waived">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={field.state.value}
                      id={field.name}
                      onCheckedChange={(checked) =>
                        field.handleChange(Boolean(checked))
                      }
                    />
                    <label className="text-sm" htmlFor={field.name}>
                      Mark if notice period is waived
                    </label>
                  </div>
                </FormField>
              )}
            </form.Field>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button onClick={handleCancel} type="button" variant="outline">
            Cancel
          </Button>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button
                disabled={!canSubmit || isSubmitting || isPending}
                type="submit"
              >
                {isSubmitting || isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </div>
  );
}
