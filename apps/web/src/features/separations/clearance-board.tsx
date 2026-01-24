"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Lock, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnHandle,
  KanbanItem,
} from "@/components/ui/kanban";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type client, orpc } from "@/utils/orpc";

type Lane =
  | "OPERATIONS"
  | "IT"
  | "FINANCE"
  | "ADMIN_ASSETS"
  | "INSURANCE"
  | "USED_CARS"
  | "HR_PAYROLL";

type ChecklistStatus = "PENDING" | "CLEARED" | "REJECTED";

const LANE_ORDER: Lane[] = [
  "OPERATIONS",
  "IT",
  "FINANCE",
  "ADMIN_ASSETS",
  "INSURANCE",
  "USED_CARS",
  "HR_PAYROLL",
];

const LANE_LABEL: Record<Lane, string> = {
  OPERATIONS: "Operations",
  IT: "IT",
  FINANCE: "Finance",
  ADMIN_ASSETS: "Admin/Assets",
  INSURANCE: "Insurance",
  USED_CARS: "Used Cars",
  HR_PAYROLL: "HR/Payroll",
};

export type SeparationBoardModel = NonNullable<
  Awaited<ReturnType<typeof client.separations.get>>
>;
type SeparationBoardItem = SeparationBoardModel["checklistItems"][number];

function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return Math.round((numerator / denominator) * 100);
}

function laneCanAct(role: string | null, lane: Lane): boolean {
  if (!role) {
    return false;
  }
  if (role === "HR" || role === "ADMIN") {
    return true;
  }
  if (role === "IT") {
    return lane === "IT";
  }
  if (role === "FINANCE") {
    return lane === "FINANCE";
  }
  return false;
}

export function ClearanceBoard({
  role,
  separation,
}: {
  role: string | null;
  separation: SeparationBoardModel;
}) {
  const queryClient = useQueryClient();
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [addLane, setAddLane] = useState<Lane>("IT");
  const [addTitle, setAddTitle] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addDueAt, setAddDueAt] = useState("");
  const [addRequired, setAddRequired] = useState(true);

  const updateChecklist = useMutation(
    orpc.separations.updateChecklist.mutationOptions({
      onSuccess: () => {
        toast.success("Checklist updated");
        queryClient.invalidateQueries();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const addChecklistItem = useMutation(
    orpc.separations.addChecklistItem.mutationOptions({
      onSuccess: () => {
        toast.success("Item added");
        queryClient.invalidateQueries();
        setAddOpen(false);
        setAddTitle("");
        setAddDescription("");
        setAddDueAt("");
        setAddRequired(true);
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const grouped = useMemo(() => {
    const initial: Record<Lane, SeparationBoardItem[]> = {
      OPERATIONS: [],
      IT: [],
      FINANCE: [],
      ADMIN_ASSETS: [],
      INSURANCE: [],
      USED_CARS: [],
      HR_PAYROLL: [],
    };
    for (const item of separation.checklistItems ?? []) {
      initial[item.lane]?.push(item);
    }

    for (const lane of LANE_ORDER) {
      initial[lane] = initial[lane].slice().sort((a, b) => {
        const dueA = a.dueAt
          ? new Date(a.dueAt).getTime()
          : Number.POSITIVE_INFINITY;
        const dueB = b.dueAt
          ? new Date(b.dueAt).getTime()
          : Number.POSITIVE_INFINITY;
        if (dueA !== dueB) {
          return dueA - dueB;
        }
        return a.title.localeCompare(b.title);
      });
    }

    return initial;
  }, [separation.checklistItems]);

  const required = separation.checklistItems.filter((i) => i.required);
  const cleared = required.filter((i) => i.status === "CLEARED");
  const progress = percent(cleared.length, required.length);

  const kanbanValue = useMemo(() => {
    const record: Record<string, SeparationBoardItem[]> = {};
    for (const lane of LANE_ORDER) {
      record[lane] = grouped[lane];
    }
    return record;
  }, [grouped]);

  const handleUpdate = (id: string, status: ChecklistStatus) => {
    const remark = remarks[id]?.trim();
    if (status === "REJECTED" && !remark) {
      toast.error("Remarks are required when rejecting");
      return;
    }

    updateChecklist.mutate({
      checklistId: id,
      status,
      remarks: remark || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-start gap-3">
            <div>
              <div className="font-semibold text-xl">
                {separation.employee.name}
              </div>
              <div className="text-muted-foreground text-sm">
                SAP: {separation.employee.sapNo} • Last day:{" "}
                {format(new Date(separation.lastWorkingDay), "MMM d, yyyy")}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Badge variant="outline">{separation.status}</Badge>
              <div className="w-44">
                <div className="mb-1 flex items-center justify-between text-muted-foreground text-xs">
                  <span>Overall</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-[width]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {cleared.length}/{required.length} required cleared
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Kanban
        flatCursor
        getItemValue={(item) => item.id}
        onValueChange={() => {
          // Checklist ordering can be enabled later for HR using reorderChecklistItems
        }}
        value={kanbanValue}
      >
        <KanbanBoard className="gap-3">
          {LANE_ORDER.map((lane) => {
            const laneItems = grouped[lane];
            const laneRequired = laneItems.filter((i) => i.required);
            const laneCleared = laneRequired.filter(
              (i) => i.status === "CLEARED",
            );
            const laneProgress = percent(
              laneCleared.length,
              laneRequired.length,
            );
            const canAct = laneCanAct(role, lane);

            return (
              <KanbanColumn
                className={cn(!canAct && "opacity-90")}
                disabled={!canAct}
                key={lane}
                value={lane}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <KanbanColumnHandle className="font-semibold text-sm">
                      {LANE_LABEL[lane]}
                    </KanbanColumnHandle>
                    <Badge className="text-[11px]" variant="secondary">
                      {laneCleared.length}/{laneRequired.length}
                    </Badge>
                    {canAct ? null : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                        <Lock className="h-3 w-3" />
                        Locked
                      </span>
                    )}
                  </div>
                  <Badge variant={laneProgress === 100 ? "default" : "outline"}>
                    {laneProgress === 100 ? "Done" : `${laneProgress}%`}
                  </Badge>
                </div>

                <div className="mt-2 flex flex-col gap-2">
                  {laneItems.map((item) => (
                    <KanbanItem
                      disabled={!canAct}
                      key={item.id}
                      value={item.id}
                    >
                      <Card
                        className={cn(
                          "border bg-background",
                          item.status === "CLEARED" &&
                            "border-emerald-200 bg-emerald-50/50",
                          item.status === "REJECTED" &&
                            "border-red-200 bg-red-50/50",
                        )}
                      >
                        <CardHeader className="space-y-1 p-3">
                          <CardTitle className="flex items-start justify-between gap-2 text-sm">
                            <span
                              className={cn(
                                "leading-snug",
                                item.status === "CLEARED" &&
                                  "text-muted-foreground line-through",
                              )}
                            >
                              {item.title}
                            </span>
                            <Badge
                              className="shrink-0"
                              variant={(() => {
                                if (item.status === "CLEARED") {
                                  return "default";
                                }
                                if (item.status === "REJECTED") {
                                  return "destructive";
                                }
                                return "outline";
                              })()}
                            >
                              {item.status}
                            </Badge>
                          </CardTitle>
                          <div className="text-[11px] text-muted-foreground">
                            {item.dueAt
                              ? `Due: ${format(new Date(item.dueAt), "MMM d")}`
                              : "No due date"}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 p-3 pt-0">
                          <Textarea
                            className="min-h-16 text-xs"
                            disabled={!canAct}
                            onChange={(e) =>
                              setRemarks((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            placeholder="Remarks (required on reject)"
                            value={remarks[item.id] ?? item.remarks ?? ""}
                          />
                          {canAct ? (
                            <div className="flex gap-2">
                              <Button
                                disabled={updateChecklist.isPending}
                                onClick={() => handleUpdate(item.id, "CLEARED")}
                                size="sm"
                              >
                                Clear
                              </Button>
                              <Button
                                disabled={updateChecklist.isPending}
                                onClick={() =>
                                  handleUpdate(item.id, "REJECTED")
                                }
                                size="sm"
                                variant="destructive"
                              >
                                Reject
                              </Button>
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    </KanbanItem>
                  ))}

                  {role === "HR" || role === "ADMIN" ? (
                    <Dialog onOpenChange={setAddOpen} open={addOpen}>
                      <DialogTrigger asChild>
                        <Button
                          className="justify-start"
                          onClick={() => setAddLane(lane)}
                          size="sm"
                          variant="ghost"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add item
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add checklist item</DialogTitle>
                          <DialogDescription>
                            Lane: {LANE_LABEL[addLane]}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <label className="text-sm" htmlFor="add-title">
                              Title
                            </label>
                            <Input
                              id="add-title"
                              onChange={(e) => setAddTitle(e.target.value)}
                              placeholder="e.g., Disable email account"
                              value={addTitle}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm" htmlFor="add-desc">
                              Description
                            </label>
                            <Textarea
                              id="add-desc"
                              onChange={(e) =>
                                setAddDescription(e.target.value)
                              }
                              placeholder="Optional details…"
                              value={addDescription}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <label className="text-sm" htmlFor="add-due">
                                Due date
                              </label>
                              <Input
                                id="add-due"
                                onChange={(e) => setAddDueAt(e.target.value)}
                                type="date"
                                value={addDueAt}
                              />
                            </div>
                            <div className="flex items-end">
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  checked={addRequired}
                                  onChange={(e) =>
                                    setAddRequired(e.target.checked)
                                  }
                                  type="checkbox"
                                />
                                Required
                              </label>
                            </div>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button
                            onClick={() => setAddOpen(false)}
                            type="button"
                            variant="outline"
                          >
                            Cancel
                          </Button>
                          <Button
                            disabled={
                              !addTitle.trim() || addChecklistItem.isPending
                            }
                            onClick={() => {
                              addChecklistItem.mutate({
                                separationId: separation.id,
                                lane: addLane,
                                title: addTitle.trim(),
                                description: addDescription.trim() || undefined,
                                required: addRequired,
                                dueAt: addDueAt
                                  ? new Date(`${addDueAt}T00:00:00`)
                                  : undefined,
                              });
                            }}
                            type="button"
                          >
                            Add
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  ) : null}
                </div>
              </KanbanColumn>
            );
          })}
        </KanbanBoard>
      </Kanban>
    </div>
  );
}
