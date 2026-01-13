"use client";

import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { BusinessTripFormProvider } from "./business-trip-form-context";
import { useBusinessTripForm } from "./use-business-trip-form";
import { UserSearchCombobox } from "./user-search-combobox";

interface BusinessTripFormProps {
  mode?: "page" | "sheet";
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BusinessTripForm({
  mode = "page",
  onSuccess,
  onCancel,
}: BusinessTripFormProps) {
  const { form, isPending, handleCancel } = useBusinessTripForm({
    onSuccess,
    onCancel,
  });

  return (
    <div
      className={cn(
        "space-y-6",
        mode === "sheet" ? "px-1" : "mx-auto max-w-3xl",
      )}
    >
      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <BusinessTripFormProvider form={form}>
          <div className="space-y-8">
            {/* Trip Details Section */}
            <Card>
              <CardHeader>
                <CardTitle>Trip Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6">
                <form.Field name="destination">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Destination</Label>
                      <Input
                        id={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="City, Country"
                        value={field.state.value}
                      />
                      {field.state.meta.errors && (
                        <p className="text-destructive text-sm">
                          {field.state.meta.errors.join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>

                <form.Field name="purpose">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Purpose</Label>
                      <Textarea
                        id={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Reason for the trip..."
                        value={field.state.value}
                      />
                      {field.state.meta.errors && (
                        <p className="text-destructive text-sm">
                          {field.state.meta.errors.join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>

                <div className="grid grid-cols-2 gap-4">
                  <form.Field name="startDate">
                    {(field) => (
                      <div className="space-y-2">
                        <Label>Start Date</Label>
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
                        {field.state.meta.errors && (
                          <p className="text-destructive text-sm">
                            {field.state.meta.errors.join(", ")}
                          </p>
                        )}
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="endDate">
                    {(field) => (
                      <div className="space-y-2">
                        <Label>End Date</Label>
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
                        {field.state.meta.errors && (
                          <p className="text-destructive text-sm">
                            {field.state.meta.errors.join(", ")}
                          </p>
                        )}
                      </div>
                    )}
                  </form.Field>
                </div>
              </CardContent>
            </Card>

            {/* Logistics Section */}
            <Card>
              <CardHeader>
                <CardTitle>Logistics & Budget</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="flex flex-wrap gap-6">
                  <form.Field name="visaRequired">
                    {(field) => (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={field.state.value}
                          id={field.name}
                          onCheckedChange={(checked) =>
                            field.handleChange(!!checked)
                          }
                        />
                        <Label htmlFor={field.name}>Visa Required</Label>
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="needsFlightBooking">
                    {(field) => (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={field.state.value}
                          id={field.name}
                          onCheckedChange={(checked) =>
                            field.handleChange(!!checked)
                          }
                        />
                        <Label htmlFor={field.name}>Flight Booking</Label>
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="needsHotelBooking">
                    {(field) => (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={field.state.value}
                          id={field.name}
                          onCheckedChange={(checked) =>
                            field.handleChange(!!checked)
                          }
                        />
                        <Label htmlFor={field.name}>Hotel Booking</Label>
                      </div>
                    )}
                  </form.Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <form.Field name="estimatedCost">
                    {(field) => (
                      <div className="space-y-2">
                        <Label htmlFor={field.name}>Estimated Cost</Label>
                        <Input
                          id={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) =>
                            field.handleChange(e.target.valueAsNumber)
                          }
                          placeholder="0.00"
                          type="number"
                          value={field.state.value ?? ""}
                        />
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="currency">
                    {(field) => (
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Select
                          onValueChange={field.handleChange}
                          value={field.state.value}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="SAR">SAR</SelectItem>
                            <SelectItem value="QAR">QAR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </form.Field>
                </div>
              </CardContent>
            </Card>

            {/* Delegation Section */}
            <Card>
              <CardHeader>
                <CardTitle>Delegation of Authority</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6">
                <form.Field name="delegatedUserId">
                  {(field) => (
                    <div className="space-y-2">
                      <Label>
                        Select Replacement{" "}
                        <span className="text-destructive">*</span>
                        <span className="ml-2 font-normal text-muted-foreground text-xs">
                          (Required per policy)
                        </span>
                      </Label>
                      <UserSearchCombobox
                        onChange={(val) => field.handleChange(val || "")}
                        placeholder="Search for delegate..."
                        value={field.state.value}
                      />
                      {field.state.meta.errors && (
                        <p className="text-destructive text-sm">
                          {field.state.meta.errors.join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>
              </CardContent>
            </Card>
          </div>
        </BusinessTripFormProvider>

        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t bg-background/80 pt-6 pb-2 blur-bg-smoke/50 backdrop-blur-sm">
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
                disabled={!canSubmit || isSubmitting || isPending}
                type="submit"
              >
                {(isSubmitting || isPending) && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Submit Request
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </div>
  );
}
