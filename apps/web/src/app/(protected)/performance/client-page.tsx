"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { REVIEW_TYPES } from "@zenith-hr/api/modules/performance/performance.schema";
import { format } from "date-fns";
import { MoreHorizontal, UserCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import { clampInt } from "@/lib/utils";
import { client, orpc } from "@/utils";

interface EmployeeRow {
  departmentId?: string;
  email: string;
  id: string;
  joiningDate?: string;
  name: string;
}

type ObjectiveStateByEmployee = Record<
  string,
  {
    activeObjectiveReviewId: string | null;
    activeObjectiveStatus: string | null;
    latestObjectiveReviewId: string | null;
    probationReviewId: string | null;
    probationConfirmationDecision:
      | "CONFIRM_EMPLOYMENT"
      | "EXTEND_PROBATION"
      | "RECOMMEND_TERMINATION"
      | null;
  }
>;

interface PerformanceClientPageProps {
  canViewEmployeeTabs: boolean;
}

function CreateObjectiveDialog({
  employee,
  onCreated,
  open,
  setOpen,
}: {
  employee: EmployeeRow;
  open: boolean;
  setOpen: (open: boolean) => void;
  onCreated: (reviewId: string) => void;
}) {
  const [objectiveMainGoal, setObjectiveMainGoal] = useState("");
  const [reviewPeriodStartDate, setReviewPeriodStartDate] = useState("");
  const [reviewPeriodEndDate, setReviewPeriodEndDate] = useState("");
  const [goals, setGoals] = useState<
    Array<{ title: string; description: string; weight: number }>
  >([{ title: "", description: "", weight: 100 }]);

  const totalWeight = goals.reduce((sum, g) => sum + (g.weight ?? 0), 0);

  const createMutation = useMutation({
    mutationFn: async () =>
      await client.performance.createObjectiveSettingForEmployee({
        employeeId: employee.id,
        objectiveMainGoal,
        reviewPeriodStart: new Date(
          `${reviewPeriodStartDate}T12:00:00`,
        ).toISOString(),
        reviewPeriodEnd: new Date(
          `${reviewPeriodEndDate}T12:00:00`,
        ).toISOString(),
        goals: goals.map((g) => ({
          title: g.title.trim(),
          description: g.description.trim() || undefined,
          weight: g.weight,
        })),
      }),
    onSuccess: (res) => {
      toast.success("Objective review created");
      setOpen(false);
      onCreated(res.reviewId);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create objective review");
    },
  });

  const canSubmit =
    objectiveMainGoal.trim().length >= 3 &&
    reviewPeriodStartDate.length > 0 &&
    reviewPeriodEndDate.length > 0 &&
    reviewPeriodStartDate <= reviewPeriodEndDate &&
    goals.length >= 1 &&
    goals.every((g) => g.title.trim().length >= 3 && g.weight >= 1) &&
    totalWeight === 100;
  const submitBlockers: string[] = [];
  if (objectiveMainGoal.trim().length < 3) {
    submitBlockers.push("Objective main goal must be at least 3 characters");
  }
  if (!(reviewPeriodStartDate && reviewPeriodEndDate)) {
    submitBlockers.push("Review period start and end are required");
  } else if (reviewPeriodStartDate > reviewPeriodEndDate) {
    submitBlockers.push("Review period end must be on or after start date");
  }
  if (!goals.length) {
    submitBlockers.push("At least one goal is required");
  }
  if (goals.some((g) => g.title.trim().length < 3)) {
    submitBlockers.push("Each goal title must be at least 3 characters");
  }
  if (totalWeight !== 100) {
    submitBlockers.push("Total goal weight must equal 100%");
  }

  return (
    <Dialog
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          return;
        }
      }}
      open={open}
    >
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create objective review</DialogTitle>
          <DialogDescription>
            For <span className="font-medium">{employee.name}</span>. Add the
            main objective, then at least one goal with weights totaling 100%.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 overflow-y-auto py-2 pr-1">
          <div className="space-y-2">
            <Label htmlFor={`objective-main-${employee.id}`}>
              Objective main goal <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`objective-main-${employee.id}`}
              onChange={(e) => setObjectiveMainGoal(e.target.value)}
              placeholder="e.g., Improve team delivery speed and quality"
              value={objectiveMainGoal}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`objective-period-start-${employee.id}`}>
                Review period start <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`objective-period-start-${employee.id}`}
                max={reviewPeriodEndDate || undefined}
                onChange={(e) => setReviewPeriodStartDate(e.target.value)}
                type="date"
                value={reviewPeriodStartDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`objective-period-end-${employee.id}`}>
                Review period end <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`objective-period-end-${employee.id}`}
                min={reviewPeriodStartDate || undefined}
                onChange={(e) => setReviewPeriodEndDate(e.target.value)}
                type="date"
                value={reviewPeriodEndDate}
              />
            </div>
          </div>
          {reviewPeriodStartDate &&
            reviewPeriodEndDate &&
            reviewPeriodStartDate > reviewPeriodEndDate && (
              <p className="text-destructive text-xs">
                Review period end must be on or after start date.
              </p>
            )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">Goals</div>
              <div className="text-muted-foreground text-xs">
                Total weight:{" "}
                <span
                  className={
                    totalWeight === 100 ? "text-foreground" : "text-destructive"
                  }
                >
                  {totalWeight}%
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {goals.map((g, idx) => (
                <div className="rounded-lg border p-3" key={idx}>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Title *</Label>
                      <Input
                        onChange={(e) => {
                          const next = e.target.value;
                          setGoals((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, title: next } : x,
                            ),
                          );
                        }}
                        placeholder="e.g., Reduce incident rate by 30%"
                        value={g.title}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Weight % *</Label>
                      <Input
                        inputMode="numeric"
                        onChange={(e) => {
                          const next = clampInt(
                            Number.parseInt(e.target.value || "0", 10),
                            0,
                            100,
                          );
                          setGoals((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, weight: next } : x,
                            ),
                          );
                        }}
                        value={g.weight}
                      />
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <Label>Description</Label>
                    <Input
                      onChange={(e) => {
                        const next = e.target.value;
                        setGoals((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, description: next } : x,
                          ),
                        );
                      }}
                      placeholder="Optional success metrics / notes"
                      value={g.description}
                    />
                  </div>

                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      disabled={goals.length <= 1}
                      onClick={() =>
                        setGoals((prev) => prev.filter((_, i) => i !== idx))
                      }
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={() =>
                setGoals((prev) => [
                  ...prev,
                  { title: "", description: "", weight: 0 },
                ])
              }
              type="button"
              variant="outline"
            >
              Add goal
            </Button>
          </div>
        </div>

        <DialogFooter className="mt-2">
          {!canSubmit && submitBlockers.length > 0 && (
            <p className="mr-auto text-destructive text-xs">
              {submitBlockers[0]}
            </p>
          )}
          <Button
            onClick={() => setOpen(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={!canSubmit || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            type="button"
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmployeeActions({
  employee,
  canManageProbationActions,
  objectiveState,
  showProbationActions,
}: {
  employee: EmployeeRow;
  canManageProbationActions?: boolean;
  objectiveState:
    | {
        activeObjectiveReviewId: string | null;
        latestObjectiveReviewId: string | null;
        probationReviewId: string | null;
        probationConfirmationDecision:
          | "CONFIRM_EMPLOYMENT"
          | "EXTEND_PROBATION"
          | "RECOMMEND_TERMINATION"
          | null;
      }
    | undefined;
  showProbationActions?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [openCreateObjective, setOpenCreateObjective] = useState(false);
  const probationReviewId = objectiveState?.probationReviewId ?? null;
  const probationDecision =
    objectiveState?.probationConfirmationDecision ?? null;
  const isConfirmedEmployment = probationDecision === "CONFIRM_EMPLOYMENT";

  const activeObjectiveId = objectiveState?.activeObjectiveReviewId ?? null;

  if (
    showProbationActions &&
    (!canManageProbationActions || isConfirmedEmployment)
  ) {
    return null;
  }

  const canCreateProbation =
    showProbationActions && canManageProbationActions && !probationReviewId;
  let probationActionItem: React.ReactNode = null;
  if (showProbationActions) {
    if (probationReviewId) {
      probationActionItem = (
        <DropdownMenuItem
          onClick={() =>
            router.push(`/performance/reviews/${probationReviewId}`)
          }
        >
          Edit probation review
        </DropdownMenuItem>
      );
    } else if (canCreateProbation) {
      probationActionItem = (
        <DropdownMenuItem
          onClick={() =>
            router.push(
              `/performance/reviews/new?employeeId=${encodeURIComponent(employee.id)}`,
            )
          }
        >
          Create probation review
        </DropdownMenuItem>
      );
    } else {
      probationActionItem = (
        <DropdownMenuItem disabled>
          Create probation review (not permitted)
        </DropdownMenuItem>
      );
    }
  }

  return (
    <>
      <CreateObjectiveDialog
        employee={employee}
        onCreated={() => {
          queryClient.invalidateQueries();
        }}
        open={openCreateObjective}
        setOpen={setOpenCreateObjective}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {probationActionItem}
          {!showProbationActions &&
            (activeObjectiveId ? (
              <>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/performance/reviews/${activeObjectiveId}`)
                  }
                >
                  Edit goal review
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(
                      `/performance/reviews/${activeObjectiveId}?submit=annual`,
                    )
                  }
                >
                  Submit as annual review
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={() => setOpenCreateObjective(true)}>
                Add goal review
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function EmployeeReviewsSheet({
  employee,
  open,
  onOpenChange,
}: {
  employee: EmployeeRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    ...orpc.performance.getReviews.queryOptions({
      input: {
        employeeId: employee?.id ?? "",
        pageSize: 50,
      },
    }),
    enabled: open && !!employee?.id,
  });

  const reviews = data?.data ?? [];

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-full sm:max-w-xl" side="right">
        <SheetHeader>
          <SheetTitle>
            {employee ? `${employee.name} – Reviews` : "Reviews"}
          </SheetTitle>
          <SheetDescription>
            {employee
              ? "Click a row to open the review."
              : "Select an employee to see their reviews."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col overflow-hidden px-4 pb-4">
          {!employee && (
            <p className="text-muted-foreground text-sm">
              No employee selected.
            </p>
          )}
          {employee && isLoading && (
            <p className="py-6 text-center text-muted-foreground text-sm">
              Loading reviews…
            </p>
          )}
          {employee && !isLoading && reviews.length === 0 && (
            <p className="py-6 text-center text-muted-foreground text-sm">
              No reviews for this employee.
            </p>
          )}
          {employee && !isLoading && reviews.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-0">Completion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    key={review.id}
                    onClick={() => {
                      onOpenChange(false);
                      router.push(`/performance/reviews/${review.id}`);
                    }}
                  >
                    <TableCell className="font-medium">
                      {REVIEW_TYPES.find((t) => t.value === review.reviewType)
                        ?.label ?? review.reviewType}
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">
                        {review.status.replace(/_/g, " ").toLowerCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {review.updatedAt
                        ? format(new Date(review.updatedAt), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {review.completionPercentage ?? 0}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function PerformanceClientPage({
  canViewEmployeeTabs,
}: PerformanceClientPageProps) {
  const { data: session } = authClient.useSession();
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRow | null>(
    null,
  );
  const [reviewsSheetOpen, setReviewsSheetOpen] = useState(false);
  const router = useRouter();

  const { data: allEmployees, isLoading: loadingAll } = useQuery({
    ...orpc.performance.getPerformanceEmployeesAll.queryOptions(),
    enabled: canViewEmployeeTabs,
  });
  const { data: probationEmployees, isLoading: loadingProbation } = useQuery({
    ...orpc.performance.getPerformanceEmployeesProbation.queryOptions(),
    enabled: canViewEmployeeTabs,
  });
  const { data: myReviews, isLoading: loadingMyReviews } = useQuery({
    ...orpc.performance.getMyReviews.queryOptions({
      input: {
        pageSize: 50,
      },
    }),
    enabled: !canViewEmployeeTabs,
  });
  const { data: departments } = useQuery({
    ...orpc.departments.getAll.queryOptions(),
    enabled: canViewEmployeeTabs,
  });

  const allIds = useMemo(
    () => (allEmployees ?? []).map((e) => e.id),
    [allEmployees],
  );
  const departmentNameById = useMemo(
    () => new Map((departments ?? []).map((d) => [d.id, d.name] as const)),
    [departments],
  );
  const getDepartmentName = (departmentId?: string) =>
    departmentId ? (departmentNameById.get(departmentId) ?? "—") : "—";
  const getRecommendationLabel = (
    recommendation:
      | "CONFIRM_EMPLOYMENT"
      | "EXTEND_PROBATION"
      | "RECOMMEND_TERMINATION"
      | null
      | undefined,
  ) => {
    if (!recommendation) {
      return "—";
    }
    switch (recommendation) {
      case "CONFIRM_EMPLOYMENT":
        return "Confirm Employment";
      case "EXTEND_PROBATION":
        return "Extend Probation";
      case "RECOMMEND_TERMINATION":
        return "Recommend Termination";
      default:
        return "—";
    }
  };
  const canManageProbationForEmployee = (employee: EmployeeRow) => {
    if (session?.user.role === "ADMIN") {
      return true;
    }

    if (session?.user.role === "HOD_HR") {
      return getDepartmentName(employee.departmentId) === "Human Resources";
    }

    // For non-HR heads, backend already scopes the probation list to their
    // department. Allow actions for all visible probation rows.
    return true;
  };

  // Single batch fetch for objective states (used for both tabs; probation is a subset of all)
  const { data: objectiveStatesMap } = useQuery({
    ...orpc.performance.getEmployeesObjectiveReviewStates.queryOptions({
      input: { employeeIds: allIds },
    }),
    enabled: canViewEmployeeTabs && allIds.length > 0,
  });

  const allStates = (objectiveStatesMap ?? {}) as ObjectiveStateByEmployee;
  const probationStates = allStates;
  const normalizedEmployeeSearch = employeeSearch.trim().toLowerCase();
  const filteredAllEmployees = useMemo(() => {
    if (!normalizedEmployeeSearch) {
      return allEmployees ?? [];
    }
    return (allEmployees ?? []).filter((emp) => {
      const name = emp.name.toLowerCase();
      const email = emp.email.toLowerCase();
      return (
        name.includes(normalizedEmployeeSearch) ||
        email.includes(normalizedEmployeeSearch)
      );
    });
  }, [allEmployees, normalizedEmployeeSearch]);
  const filteredProbationEmployees = useMemo(() => {
    if (!normalizedEmployeeSearch) {
      return probationEmployees ?? [];
    }
    return (probationEmployees ?? []).filter((emp) => {
      const name = emp.name.toLowerCase();
      const email = emp.email.toLowerCase();
      return (
        name.includes(normalizedEmployeeSearch) ||
        email.includes(normalizedEmployeeSearch)
      );
    });
  }, [probationEmployees, normalizedEmployeeSearch]);

  const openEmployeeReviews = (employee: EmployeeRow) => {
    setSelectedEmployee(employee);
    setReviewsSheetOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl tracking-tight">
          Performance Management
        </h1>
        <p className="text-muted-foreground">
          Manage goal achievements and probation reviews.
        </p>
      </div>

      <EmployeeReviewsSheet
        employee={selectedEmployee}
        onOpenChange={setReviewsSheetOpen}
        open={reviewsSheetOpen}
      />

      {/* Employee tabs (HOD only) */}
      {canViewEmployeeTabs && (
        <Card>
          <CardHeader>
            <CardTitle>Employees</CardTitle>
            <CardDescription>
              All employees or those due for probation review (joined &gt;6
              months ago, no probation review done).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Search by employee name or email"
                value={employeeSearch}
              />
            </div>
            <Tabs className="w-full" defaultValue="all">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger className="gap-2" value="all">
                  <Users className="h-4 w-4" />
                  All employees
                </TabsTrigger>
                <TabsTrigger className="gap-2" value="probation">
                  <UserCheck className="h-4 w-4" />
                  Probation employees
                </TabsTrigger>
              </TabsList>
              <TabsContent className="mt-4" value="all">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Joining date</TableHead>
                      <TableHead className="w-0 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingAll && (
                      <TableRow>
                        <TableCell
                          className="py-8 text-center text-muted-foreground"
                          colSpan={5}
                        >
                          Loading…
                        </TableCell>
                      </TableRow>
                    )}
                    {!loadingAll &&
                      (filteredAllEmployees.length
                        ? filteredAllEmployees.map((emp) => (
                            <TableRow
                              className="cursor-pointer hover:bg-muted/50"
                              key={emp.id}
                              onClick={() => openEmployeeReviews(emp)}
                            >
                              <TableCell className="font-medium">
                                {emp.name}
                              </TableCell>
                              <TableCell>{emp.email}</TableCell>
                              <TableCell>
                                {getDepartmentName(emp.departmentId)}
                              </TableCell>
                              <TableCell>
                                {emp.joiningDate
                                  ? format(
                                      new Date(emp.joiningDate),
                                      "MMM d, yyyy",
                                    )
                                  : "—"}
                              </TableCell>
                              <TableCell
                                className="text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <EmployeeActions
                                  canManageProbationActions={canManageProbationForEmployee(
                                    emp,
                                  )}
                                  employee={emp}
                                  objectiveState={allStates[emp.id]}
                                  showProbationActions={false}
                                />
                              </TableCell>
                            </TableRow>
                          ))
                        : [
                            <TableRow key="empty">
                              <TableCell
                                className="py-8 text-center text-muted-foreground"
                                colSpan={5}
                              >
                                {normalizedEmployeeSearch
                                  ? "No employees match your search."
                                  : "No employees found."}
                              </TableCell>
                            </TableRow>,
                          ])}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent className="mt-4" value="probation">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Recommendation</TableHead>
                      <TableHead>Joining date</TableHead>
                      <TableHead className="w-0 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingProbation && (
                      <TableRow>
                        <TableCell
                          className="py-8 text-center text-muted-foreground"
                          colSpan={6}
                        >
                          Loading…
                        </TableCell>
                      </TableRow>
                    )}
                    {!loadingProbation &&
                      (filteredProbationEmployees.length
                        ? filteredProbationEmployees.map((emp) => (
                            <TableRow
                              className="cursor-pointer hover:bg-muted/50"
                              key={emp.id}
                              onClick={() => openEmployeeReviews(emp)}
                            >
                              <TableCell className="font-medium">
                                {emp.name}
                              </TableCell>
                              <TableCell>{emp.email}</TableCell>
                              <TableCell>
                                {getDepartmentName(emp.departmentId)}
                              </TableCell>
                              <TableCell>
                                {getRecommendationLabel(
                                  probationStates[emp.id]
                                    ?.probationConfirmationDecision ?? null,
                                )}
                              </TableCell>
                              <TableCell>
                                {emp.joiningDate
                                  ? format(
                                      new Date(emp.joiningDate),
                                      "MMM d, yyyy",
                                    )
                                  : "—"}
                              </TableCell>
                              <TableCell
                                className="text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <EmployeeActions
                                  canManageProbationActions={canManageProbationForEmployee(
                                    emp,
                                  )}
                                  employee={emp}
                                  objectiveState={probationStates[emp.id]}
                                  showProbationActions={true}
                                />
                              </TableCell>
                            </TableRow>
                          ))
                        : [
                            <TableRow key="empty">
                              <TableCell
                                className="py-8 text-center text-muted-foreground"
                                colSpan={6}
                              >
                                {normalizedEmployeeSearch
                                  ? "No probation employees match your search."
                                  : "No employees due for probation review."}
                              </TableCell>
                            </TableRow>,
                          ])}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {!canViewEmployeeTabs && (
        <Card>
          <CardHeader>
            <CardTitle>My Reviews</CardTitle>
            <CardDescription>
              Reviews where you are the employee under evaluation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-0 text-right">Completion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingMyReviews && (
                  <TableRow>
                    <TableCell
                      className="py-8 text-center text-muted-foreground"
                      colSpan={4}
                    >
                      Loading your reviews...
                    </TableCell>
                  </TableRow>
                )}
                {!loadingMyReviews &&
                  ((myReviews?.data?.length ?? 0) > 0
                    ? myReviews?.data.map((review) => (
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          key={review.id}
                          onClick={() =>
                            router.push(`/performance/reviews/${review.id}`)
                          }
                        >
                          <TableCell className="font-medium">
                            {REVIEW_TYPES.find(
                              (t) => t.value === review.reviewType,
                            )?.label ?? review.reviewType}
                          </TableCell>
                          <TableCell>
                            <span className="capitalize">
                              {review.status.replace(/_/g, " ").toLowerCase()}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {review.updatedAt
                              ? format(
                                  new Date(review.updatedAt),
                                  "MMM d, yyyy",
                                )
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {review.completionPercentage ?? 0}%
                          </TableCell>
                        </TableRow>
                      ))
                    : [
                        <TableRow key="empty-my-reviews">
                          <TableCell
                            className="py-8 text-center text-muted-foreground"
                            colSpan={4}
                          >
                            No reviews found for your account.
                          </TableCell>
                        </TableRow>,
                      ])}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
