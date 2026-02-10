"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addExpenseSchema,
  TRAVEL_CLASS_OPTIONS,
  TRIP_PURPOSE_OPTIONS,
} from "@zenith-hr/api/modules/business-trips/business-trips.schema";
import { format } from "date-fns";
import { ArrowLeft, MapPin, Plane, Plus, User } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { orpc } from "@/utils/orpc";

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

interface BusinessTripDetailClientPageProps {
  role: string | null;
}

export function BusinessTripDetailClientPage({
  role,
}: BusinessTripDetailClientPageProps) {
  const params = useParams<{ id: string }>();
  const _router = useRouter();
  const queryClient = useQueryClient();
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);

  const { data: trip, isLoading: isTripLoading } = useQuery(
    orpc.businessTrips.getById.queryOptions({ input: { id: params.id } }),
  );

  const { data: expenses, isLoading: isExpensesLoading } = useQuery(
    orpc.businessTrips.getExpenses.queryOptions({
      input: { tripId: params.id },
    }),
  );

  const { mutateAsync: transitionTrip } = useMutation(
    orpc.businessTrips.transition.mutationOptions({
      onSuccess: () => {
        toast.success("Trip status updated");
        queryClient.invalidateQueries({
          queryKey: orpc.businessTrips.getById.key({
            input: { id: params.id },
          }),
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

  const canReject =
    (role === "MANAGER" && trip.status === "PENDING_MANAGER") ||
    (role === "HR" && trip.status === "PENDING_HR") ||
    role === "ADMIN";

  const canApprove =
    (role === "MANAGER" && trip.status === "PENDING_MANAGER") ||
    (role === "HR" && trip.status === "PENDING_HR") ||
    (role === "ADMIN" && trip.status !== "APPROVED");

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
          {canReject && (
            <Button
              onClick={() =>
                transitionTrip({ tripId: trip.id, action: "REJECT" })
              }
              variant="destructive"
            >
              Reject
            </Button>
          )}
          {canApprove && (
            <Button
              onClick={() =>
                transitionTrip({ tripId: trip.id, action: "APPROVE" })
              }
            >
              Approve
            </Button>
          )}
          {trip.status === "DRAFT" && (
            <Button
              onClick={() =>
                transitionTrip({ tripId: trip.id, action: "SUBMIT" })
              }
            >
              Submit for Approval
            </Button>
          )}
        </div>
      </div>

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
                {formatRole(trip.requester.role ?? "REQUESTER")}
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
              <Badge variant="outline">{trip.status}</Badge>
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
                          <Input
                            id={field.name}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e) =>
                              field.handleChange(
                                e.target.value
                                  ? new Date(e.target.value)
                                  : new Date(),
                              )
                            }
                            type="date"
                            value={
                              field.state.value instanceof Date
                                ? field.state.value.toISOString().split("T")[0]
                                : ""
                            }
                          />
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
