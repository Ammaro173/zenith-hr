"use client";

import { useQuery } from "@tanstack/react-query";
import {
  TRAVEL_CLASS_OPTIONS,
  TRIP_PURPOSE_OPTIONS,
} from "@zenith-hr/api/modules/business-trips/business-trips.schema";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Plane, User } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { UserSearchCombobox } from "@/components/shared/user-search-combobox";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";
import { BusinessTripFormProvider } from "./business-trip-form-context";
import { useBusinessTripForm } from "./use-business-trip-form";

function formatRole(role: string): string {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

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

  const { data: session } = authClient.useSession();
  const sessionUser = session?.user;

  // Fetch department name for the current user
  const { data: userSearchResults } = useQuery({
    ...orpc.users.search.queryOptions({
      input: { query: sessionUser?.email ?? "", limit: 1 },
    }),
    enabled: !!sessionUser?.email,
  });

  const departmentName =
    userSearchResults?.[0]?.departmentName ?? "Not assigned";

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
            {/* Requester Information (Read-Only) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="size-5" />
                  Requester Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessionUser ? (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-1">
                      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        Name
                      </p>
                      <p className="font-medium text-sm">{sessionUser.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        Email
                      </p>
                      <p className="text-sm">{sessionUser.email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        SAP Number
                      </p>
                      <p className="font-mono text-sm">
                        {(sessionUser as { sapNo?: string }).sapNo ?? "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        Department
                      </p>
                      <p className="text-sm">{departmentName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        Position
                      </p>
                      <Badge variant="outline">
                        {formatRole(
                          (sessionUser as { role?: string }).role ??
                            "REQUESTER",
                        )}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Loading user information...
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Trip Details Section */}
            <Card>
              <CardHeader>
                <CardTitle>Trip Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6">
                {/* Destination: Country + City */}
                <div className="grid grid-cols-2 gap-4">
                  <form.Field name="country">
                    {(field) => (
                      <FormField field={field} label="Country">
                        <Input
                          id={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="e.g. Qatar"
                          value={field.state.value}
                        />
                      </FormField>
                    )}
                  </form.Field>

                  <form.Field name="city">
                    {(field) => (
                      <FormField field={field} label="City">
                        <Input
                          id={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="e.g. Doha"
                          value={field.state.value}
                        />
                      </FormField>
                    )}
                  </form.Field>
                </div>

                {/* Purpose: Dropdown + Details */}
                <form.Field name="purposeType">
                  {(field) => (
                    <FormField field={field} label="Purpose of Trip">
                      <Select
                        onValueChange={(value) =>
                          field.handleChange(value as typeof field.state.value)
                        }
                        value={field.state.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select purpose..." />
                        </SelectTrigger>
                        <SelectContent>
                          {TRIP_PURPOSE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  )}
                </form.Field>

                <form.Field name="purposeDetails">
                  {(field) => (
                    <FormField field={field} label="Detailed Purpose">
                      <Textarea
                        id={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Provide additional details about the trip purpose..."
                        value={field.state.value ?? ""}
                      />
                    </FormField>
                  )}
                </form.Field>

                <Separator />

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <form.Field name="startDate">
                    {(field) => (
                      <FormField field={field} label="Start Date">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.state.value && "text-muted-foreground",
                              )}
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

                  <form.Field name="endDate">
                    {(field) => (
                      <FormField field={field} label="End Date">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.state.value && "text-muted-foreground",
                              )}
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
                      <FormField field={field} label="Estimated Cost">
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
                      </FormField>
                    )}
                  </form.Field>
                  <form.Field name="currency">
                    {(field) => (
                      <FormField field={field} label="Currency">
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
                      </FormField>
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
                    <FormField
                      description="Person who will handle your responsibilities while you're away"
                      field={field}
                      label="Select Replacement (Optional)"
                    >
                      <UserSearchCombobox
                        onChange={field.handleChange}
                        placeholder="Search for delegate..."
                        value={field.state.value}
                      />
                    </FormField>
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
