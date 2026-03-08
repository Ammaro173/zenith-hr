"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addExpenseSchema,
  TRAVEL_CLASS_OPTIONS,
  TRIP_PURPOSE_OPTIONS,
} from "@zenith-hr/api/modules/business-trips/business-trips.schema";
import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarIcon,
  Check,
  Edit,
  Loader2,
  MapPin,
  MessageSquare,
  Plane,
  Plus,
  User,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { STATUS_VARIANTS, TRIP_STEP_LABELS } from "@/types/business-trips";
import { orpc } from "@/utils/orpc";
import { WorkflowProgress } from "../../approvals/_components/workflow-progress";

type AddExpenseInput = z.input<typeof addExpenseSchema>;

function formatPurposeType(type: string): string {
  const option = TRIP_PURPOSE_OPTIONS.find((o) => o.value === type);
  return option?.label ?? type;
}

function formatRole(role: string): string {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatTravelClass(cls: string | null): string {
  if (!cls) {
    return "Not specified";
  }
  const option = TRAVEL_CLASS_OPTIONS.find((o) => o.value === cls);
  return option?.label ?? cls;
}

const PENDING_TRIP_STATUSES = [
  "PENDING_MANAGER",
  "PENDING_HOD",
  "PENDING_HR",
  "PENDING_FINANCE",
  "PENDING_CEO",
] as const;

const EDITABLE_TRIP_STATUSES = ["DRAFT", "CHANGE_REQUESTED"] as const;

interface BusinessTripDetailClientPageProps {
  currentUserId?: string;
  currentUserRole?: string;
  role: string | null;
}

export function BusinessTripDetailClientPage({
  currentUserId,
  currentUserRole,
  role: _role,
}: BusinessTripDetailClientPageProps) {
  const params = useParams<{ id: string }>();
  const _router = useRouter();
  const queryClient = useQueryClient();
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [comment, setComment] = useState("");

  const { data: trip, isLoading: isTripLoading } = useQuery(
    orpc.businessTrips.getById.queryOptions({ input: { id: params.id } }),
  );

  const { data: expenses, isLoading: isExpensesLoading } = useQuery(
    orpc.businessTrips.getExpenses.queryOptions({
      input: { tripId: params.id },
    }),
  );

  const { data: approvalHistory } = useQuery(
    orpc.businessTrips.getApprovalHistory.queryOptions({
      input: { tripId: params.id },
    }),
  );

  const getActionBadgeVariant = (
    action: string,
  ): "default" | "destructive" | "secondary" => {
    switch (action) {
      case "REJECT":
        return "destructive";
      case "REQUEST_CHANGE":
        return "secondary";
      case "APPROVE":
        return "default";
      default:
        return "secondary";
    }
  };

  const { mutateAsync: transitionTrip, isPending: isTransitionPending } =
    useMutation(
      orpc.businessTrips.transition.mutationOptions({
        onSuccess: () => {
          toast.success("Trip status updated");
          queryClient.invalidateQueries({
            queryKey: orpc.businessTrips.getById.key({
              input: { id: params.id },
            }),
          });
          queryClient.invalidateQueries({
            queryKey: orpc.businessTrips.getMyTrips.key(),
          });
          queryClient.invalidateQueries({
            queryKey: orpc.businessTrips.getAllRelated.key(),
          });
          queryClient.invalidateQueries({
            queryKey: orpc.dashboard.getActionsRequired.key(),
          });
        },
        onError: (error) => {
          toast.error(`Failed to update status: ${error.message}`);
        },
      }),
    );

  const { mutateAsync: addExpense } = useMutation(
    orpc.businessTrips.addExpense.mutationOptions({
      onSuccess: () => {
        toast.success("Expense added successfully");
        queryClient.invalidateQueries({
          queryKey: orpc.businessTrips.getExpenses.key({
            input: { tripId: params.id },
          }),
        });
        setIsExpenseDialogOpen(false);
      },
      onError: (error) => {
        toast.error(`Failed to add expense: ${error.message}`);
      },
    }),
  );

  const expenseDefaults: AddExpenseInput = {
    tripId: params.id,
    category: "MEAL",
    amount: 1,
    currency: "QAR",
    date: new Date(),
    description: "",
    receiptUrl: "",
  };

  const expenseForm = useForm({
    defaultValues: expenseDefaults,
    validators: {
      onSubmit: addExpenseSchema,
    },
    onSubmit: async ({ value }) => {
      await addExpense(value);
    },
  });

  if (isTripLoading) {
    return <div>Loading...</div>;
  }

  if (!trip) {
    return <div>Trip not found</div>;
  }

  const isPending = PENDING_TRIP_STATUSES.includes(
    trip.status as (typeof PENDING_TRIP_STATUSES)[number],
  );
  const matchByPosition = trip.currentApprover?.id === currentUserId;
  const matchByRole =
    !!trip.requiredApproverRole &&
    currentUserRole === trip.requiredApproverRole;
  const isApprover = isPending && (matchByPosition || matchByRole);
  // const isRequester = trip.requesterId === currentUserId;
  // const isApprover =
  //   isPending && !isRequester && (matchByPosition || matchByRole);
  const canSubmit =
    (trip.status === "DRAFT" || trip.status === "CHANGE_REQUESTED") &&
    trip.requesterId === currentUserId;
  const canResubmit =
    trip.status === "CHANGE_REQUESTED" && trip.requesterId === currentUserId;
  const canEdit =
    trip.requesterId === currentUserId &&
    EDITABLE_TRIP_STATUSES.includes(
      trip.status as (typeof EDITABLE_TRIP_STATUSES)[number],
    );
  const approvalHistoryCommentLabel = (action: string) => {
    if (action === "REJECT") {
      return "Rejection Reason:";
    }
    if (action === "REQUEST_CHANGE") {
      return "Change Request:";
    }
    return "Note:";
  };

  const hasExpenses = (expenses?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button asChild size="icon" variant="ghost">
          <Link href="/business-trips">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Trip Details</h1>
          <p className="text-muted-foreground">
            {trip.city}, {trip.country} •{" "}
            {format(new Date(trip.startDate), "MMM d")} -{" "}
            {format(new Date(trip.endDate), "MMM d, yyyy")}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          {canEdit && (
            <Button asChild type="button" variant="outline">
              <Link href={`/business-trips/${trip.id}/edit` as Route}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Trip
              </Link>
            </Button>
          )}
          {canSubmit && (
            <Button
              onClick={() =>
                transitionTrip({ tripId: trip.id, action: "SUBMIT" })
              }
            >
              {canResubmit ? "Resubmit for Approval" : "Submit for Approval"}
            </Button>
          )}
        </div>
      </div>

      {isApprover && (
        <Card className="border-primary/20 shadow-lg shadow-primary/5">
          <CardHeader className="bg-primary/5 pb-4">
            <CardTitle className="font-bold text-base">
              Pending Your Action
            </CardTitle>
            <p className="text-muted-foreground text-xs">
              As {trip.requiredApproverRole ?? "approver"}, please review this
              trip request.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-wider">
                COMMENTS (required for rejection or change request)
              </Label>
              <Textarea
                className="min-h-25 resize-none"
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a note (required when rejecting or requesting changes)..."
                value={comment}
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Button
                className="w-full bg-black text-white hover:bg-black/90"
                disabled={isTransitionPending}
                onClick={() =>
                  transitionTrip({
                    tripId: trip.id,
                    action: "APPROVE",
                    comment: comment || undefined,
                  }).then(() => setComment(""))
                }
              >
                {isTransitionPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Approve
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="w-full"
                  disabled={isTransitionPending || !comment.trim()}
                  onClick={() =>
                    transitionTrip({
                      tripId: trip.id,
                      action: "REQUEST_CHANGE",
                      comment: comment.trim(),
                    }).then(() => setComment(""))
                  }
                  variant="outline"
                >
                  {isTransitionPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Request Changes
                </Button>
                <Button
                  className="w-full text-destructive hover:bg-destructive/5"
                  disabled={isTransitionPending || !comment.trim()}
                  onClick={() =>
                    transitionTrip({
                      tripId: trip.id,
                      action: "REJECT",
                      comment: comment.trim(),
                    }).then(() => setComment(""))
                  }
                  variant="outline"
                >
                  {isTransitionPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Reject
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {canResubmit && (
        <Card className="border-amber-200 shadow-amber-500/5 shadow-lg">
          <CardHeader className="bg-amber-50 pb-4">
            <CardTitle className="font-bold text-base">
              Changes Requested
            </CardTitle>
            <p className="text-muted-foreground text-xs">
              Review the approval history comments, then resubmit this trip when
              ready.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <Button asChild className="w-full" type="button" variant="outline">
              <Link href={`/business-trips/${trip.id}/edit` as Route}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Trip
              </Link>
            </Button>
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-wider">
                COMMENTS (optional)
              </Label>
              <Textarea
                className="min-h-20 resize-none"
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a note about the updates you made..."
                value={comment}
              />
            </div>
            <Button
              className="w-full"
              disabled={isTransitionPending}
              onClick={() =>
                transitionTrip({
                  tripId: trip.id,
                  action: "SUBMIT",
                  comment: comment.trim() || undefined,
                }).then(() => setComment(""))
              }
            >
              {isTransitionPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Resubmit Trip
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Requester Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-4" />
              Requester
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Name</span>
              <span className="font-medium text-sm">{trip.requester.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Email</span>
              <span className="text-sm">{trip.requester.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">SAP Number</span>
              <span className="font-mono text-sm">{trip.requester.sapNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Department</span>
              <span className="text-sm">
                {trip.departmentName ?? "Not assigned"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Position</span>
              <Badge variant="outline">
                {formatRole(trip.requester.role ?? "EMPLOYEE")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge
                variant={STATUS_VARIANTS[trip.status]?.variant ?? "outline"}
              >
                {STATUS_VARIANTS[trip.status]?.label ?? trip.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Destination</span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {trip.city}, {trip.country}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Purpose</span>
              <span>{formatPurposeType(trip.purposeType)}</span>
            </div>
            {trip.purposeDetails && (
              <div className="space-y-1">
                <span className="text-muted-foreground text-sm">
                  Purpose Details
                </span>
                <p className="text-sm">{trip.purposeDetails}</p>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Cost</span>
              <span>
                {trip.currency} {trip.estimatedCost}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Visa Required</span>
              <span>{trip.visaRequired ? "Yes" : "No"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Approval Workflow Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="size-4" />
              Approval Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WorkflowProgress currentStatus={trip.status} />
          </CardContent>
        </Card>

        {/* Flight Details (conditional) */}
        {trip.needsFlightBooking && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="size-4" />
                Flight Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">
                  Departure City
                </span>
                <span className="text-sm">
                  {trip.departureCity || "Not specified"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">
                  Arrival City
                </span>
                <span className="text-sm">
                  {trip.arrivalCity || "Not specified"}
                </span>
              </div>
              {trip.preferredDepartureDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">
                    Preferred Departure
                  </span>
                  <span className="text-sm">
                    {format(
                      new Date(trip.preferredDepartureDate),
                      "MMM d, yyyy",
                    )}
                  </span>
                </div>
              )}
              {trip.preferredArrivalDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">
                    Preferred Return
                  </span>
                  <span className="text-sm">
                    {format(new Date(trip.preferredArrivalDate), "MMM d, yyyy")}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">
                  Travel Class
                </span>
                <span className="text-sm">
                  {formatTravelClass(trip.travelClass)}
                </span>
              </div>
              {trip.flightNotes && (
                <div className="space-y-1">
                  <span className="text-muted-foreground text-sm">
                    Special Requests
                  </span>
                  <p className="text-sm">{trip.flightNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Approval History */}
        {approvalHistory && approvalHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-4" />
                Approval History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {approvalHistory.map((log) => (
                <div
                  className="rounded-lg border bg-muted/30 p-4 text-sm"
                  key={log.id}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        className="text-xs"
                        variant={getActionBadgeVariant(log.action)}
                      >
                        {log.action}
                      </Badge>
                      <span className="font-medium">
                        {log.actor?.name || "Unknown"}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {format(new Date(log.performedAt), "dd MMM yyyy, HH:mm")}
                    </span>
                  </div>
                  {log.stepName && (
                    <p className="mt-1 text-muted-foreground text-xs">
                      Step: {TRIP_STEP_LABELS[log.stepName] ?? log.stepName}
                    </p>
                  )}
                  {log.comment && (
                    <div className="mt-2 rounded bg-background p-2 text-sm">
                      <p className="mb-1 text-muted-foreground text-xs">
                        {approvalHistoryCommentLabel(log.action)}
                      </p>
                      <p>{log.comment}</p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Expenses</CardTitle>
              <Dialog
                onOpenChange={setIsExpenseDialogOpen}
                open={isExpenseDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Expense
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Expense</DialogTitle>
                    <DialogDescription>
                      Record a new expense for this trip.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      expenseForm.handleSubmit();
                    }}
                  >
                    <expenseForm.Field name="category">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>Category</Label>
                          <Input
                            id={field.name}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e) =>
                              field.handleChange(
                                e.target.value as AddExpenseInput["category"],
                              )
                            }
                            placeholder="e.g. MEAL, TRANSPORT"
                            value={field.state.value}
                          />
                        </div>
                      )}
                    </expenseForm.Field>
                    <div className="grid grid-cols-2 gap-4">
                      <expenseForm.Field name="amount">
                        {(field) => (
                          <div className="space-y-2">
                            <Label htmlFor={field.name}>Amount</Label>
                            <Input
                              id={field.name}
                              name={field.name}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(
                                  Number.parseFloat(e.target.value) || 0,
                                )
                              }
                              type="number"
                              value={String(field.state.value ?? 0)}
                            />
                          </div>
                        )}
                      </expenseForm.Field>
                      <expenseForm.Field name="currency">
                        {(field) => (
                          <div className="space-y-2">
                            <Label htmlFor={field.name}>Currency</Label>
                            <Select
                              onValueChange={field.handleChange}
                              value={field.state.value}
                            >
                              <SelectTrigger id={field.name}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="QAR">QAR</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </expenseForm.Field>
                    </div>
                    <expenseForm.Field name="date">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>Date</Label>
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
                                  format(new Date(field.state.value), "PPP")
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
                                selected={
                                  field.state.value
                                    ? new Date(field.state.value)
                                    : undefined
                                }
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                    </expenseForm.Field>
                    <expenseForm.Field name="description">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>Description</Label>
                          <Textarea
                            id={field.name}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            value={field.state.value}
                          />
                        </div>
                      )}
                    </expenseForm.Field>
                    <div className="flex justify-end">
                      <expenseForm.Subscribe
                        selector={(state) => [
                          state.canSubmit,
                          state.isSubmitting,
                        ]}
                      >
                        {([canSubmit, isSubmitting]) => (
                          <Button
                            disabled={!canSubmit || isSubmitting}
                            type="submit"
                          >
                            {isSubmitting ? "Saving..." : "Save Expense"}
                          </Button>
                        )}
                      </expenseForm.Subscribe>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isExpensesLoading ? (
                  <TableRow>
                    <TableCell className="text-center" colSpan={4}>
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : null}

                {isExpensesLoading || hasExpenses ? null : (
                  <TableRow>
                    <TableCell className="text-center" colSpan={4}>
                      No expenses recorded.
                    </TableCell>
                  </TableRow>
                )}

                {!isExpensesLoading && hasExpenses
                  ? (expenses?.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          {format(new Date(expense.date), "MMM d")}
                        </TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell className="text-right">
                          {expense.currency} {expense.amount}
                        </TableCell>
                      </TableRow>
                    )) ?? null)
                  : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
