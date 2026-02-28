"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { client } from "@/utils/orpc";

interface Goal {
  description: string | null;
  id: string;
  status: string;
  targetDate?: Date | string | null;
  title: string;
}

interface FutureGoalsSectionProps {
  goals: Goal[];
  reviewId: string;
}

export function FutureGoalsSection({
  reviewId,
  goals,
}: FutureGoalsSectionProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDescription, setNewGoalDescription] = useState("");

  const createGoalMutation = useMutation({
    mutationFn: (data: {
      reviewId: string;
      title: string;
      description?: string;
    }) => client.performance.createGoal(data),
    onSuccess: () => {
      toast.success("Goal added");
      queryClient.invalidateQueries();
      setIsDialogOpen(false);
      setNewGoalTitle("");
      setNewGoalDescription("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add goal");
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (goalId: string) => client.performance.deleteGoal({ goalId }),
    onSuccess: () => {
      toast.success("Goal removed");
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove goal");
    },
  });

  const handleAddGoal = () => {
    if (!newGoalTitle.trim()) {
      toast.error("Title is required");
      return;
    }

    createGoalMutation.mutate({
      reviewId,
      title: newGoalTitle.trim(),
      description: newGoalDescription.trim() || undefined,
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-muted-foreground text-sm uppercase tracking-wider">
          Future Goals
        </h3>
        <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="mr-2 size-4" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Future Goal</DialogTitle>
              <DialogDescription>
                Set a goal for the employee to work towards.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="goal-title">Goal Title *</Label>
                <Input
                  id="goal-title"
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="e.g., Lead the automated testing migration"
                  value={newGoalTitle}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-description">Description</Label>
                <Textarea
                  id="goal-description"
                  onChange={(e) => setNewGoalDescription(e.target.value)}
                  placeholder="Description and success metrics..."
                  value={newGoalDescription}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setIsDialogOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={createGoalMutation.isPending}
                onClick={handleAddGoal}
                type="button"
              >
                Add Goal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No goals set yet. Add goals for the employee to work towards.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {goals.map((goal, index) => (
            <Card key={goal.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">
                      {index + 1}
                    </span>
                    <CardTitle className="text-base">{goal.title}</CardTitle>
                  </div>
                  <Button
                    disabled={deleteGoalMutation.isPending}
                    onClick={() => deleteGoalMutation.mutate(goal.id)}
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              {goal.description && (
                <CardContent className="pt-0">
                  <CardDescription>{goal.description}</CardDescription>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
