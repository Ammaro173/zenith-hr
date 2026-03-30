"use client";

import { elevatedSeparationTypes } from "@zenith-hr/api/modules/separations/separations.schema";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Upload, X } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
} from "@/components/ui/file-upload";
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
import { getRoleFromSessionUser } from "@/config/navigation";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useSeparationForm } from "./use-separation-form";

const SEPARATION_TYPE_OPTIONS = [
  { value: "RESIGNATION", label: "Resignation" },
  { value: "TERMINATION", label: "Termination" },
  { value: "RETIREMENT", label: "Retirement" },
  { value: "END_OF_CONTRACT", label: "End of Contract" },
] as const;

interface SeparationFormProps {
  mode?: "page" | "sheet";
  onCancel?: () => void;
  onSuccess?: (request: { id: string }) => void;
}

export function SeparationForm({
  mode = "page",
  onSuccess,
  onCancel,
}: SeparationFormProps) {
  const { data: session } = authClient.useSession();
  const role = getRoleFromSessionUser(session?.user);
  const showManagerHrTypes = role !== null && role !== "EMPLOYEE";
  const typeOptions = showManagerHrTypes
    ? [...SEPARATION_TYPE_OPTIONS]
    : SEPARATION_TYPE_OPTIONS.filter(
        (opt) =>
          !(elevatedSeparationTypes as readonly string[]).includes(opt.value),
      );

  const { form, file, setFile, isPending, handleCancel } = useSeparationForm({
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
                      {typeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
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

            <form.Subscribe selector={(state) => state.values.type}>
              {(type) =>
                type === "RESIGNATION" && (
                  <div className="space-y-2">
                    <span className="font-medium text-sm">
                      Resignation Letter{" "}
                      <span className="text-destructive">*</span>
                    </span>
                    <FileUpload
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      maxFiles={1}
                      maxSize={5 * 1024 * 1024} // 5MB
                      onAccept={(files) => setFile(files[0] || null)}
                      value={file ? [file] : []}
                    >
                      <FileUploadDropzone className="min-h-[120px] cursor-pointer">
                        <div className="flex flex-col items-center gap-2 text-center">
                          <div className="rounded-full bg-muted p-2">
                            <Upload className="size-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              Upload resignation letter
                            </p>
                            <p className="text-muted-foreground text-xs">
                              Max 5MB. PDF, Word, or Images.
                            </p>
                          </div>
                        </div>
                      </FileUploadDropzone>
                      <FileUploadList>
                        {file && (
                          <FileUploadItem value={file}>
                            <FileUploadItemPreview />
                            <FileUploadItemMetadata />
                            <FileUploadItemDelete asChild>
                              <Button
                                className="size-7"
                                onClick={() => setFile(null)}
                                size="icon"
                                variant="ghost"
                              >
                                <X className="size-4" />
                                <span className="sr-only">Remove file</span>
                              </Button>
                            </FileUploadItemDelete>
                          </FileUploadItem>
                        )}
                      </FileUploadList>
                    </FileUpload>
                  </div>
                )
              }
            </form.Subscribe>
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
