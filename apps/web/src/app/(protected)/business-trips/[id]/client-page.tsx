"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { addExpenseSchema } from "@zenith-hr/api/modules/business-trips/business-trips.schema";
import { format } from "date-fns";
import { ArrowLeft, Plus } from "lucide-react";
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
    currency: "USD",
    date: new Date(),
    description: "",
    receiptUrl: "",
  };

  const expenseForm = useForm({
    defaultValues: expenseDefaults,
    //TODO
    // validators
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
            {trip.destination} • {format(new Date(trip.startDate), "MMM d")} -{" "}
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
              <span className="text-muted-foreground">Purpose</span>
              <span>{trip.purpose}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Cost</span>
              <span>
                {trip.currency} {trip.estimatedCost}
              </span>
            </div>
          </CardContent>
        </Card>

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
                            <Input
                              id={field.name}
                              name={field.name}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              value={field.state.value}
                            />
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
