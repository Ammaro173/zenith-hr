"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { REVIEW_TYPES } from "@zenith-hr/api/modules/performance/performance.schema";
import { Loader2 } from "lucide-react";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { UserSearchCombobox } from "@/components/shared/user-search-combobox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { client } from "@/utils/orpc";

type ReviewType = "PROBATION" | "ANNUAL_PERFORMANCE" | "OBJECTIVE_SETTING";

export default function InterceptedNewReviewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const cycleId = params.id;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(true);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [reviewType, setReviewType] =
    useState<ReviewType>("ANNUAL_PERFORMANCE");

  const createReviewMutation = useMutation({
    mutationFn: (data: {
      cycleId: string;
      employeeId: string;
      reviewType: ReviewType;
    }) => client.performance.createReview(data),
    onSuccess: (review) => {
      toast.success("Review created successfully");
      queryClient.invalidateQueries();
      setOpen(false);
      router.push(`/performance/reviews/${review.id}` as Route);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create review");
    },
  });

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      router.back();
    }
  };

  const handleSubmit = () => {
    if (!selectedEmployeeId) {
      toast.error("Please select an employee");
      return;
    }

    createReviewMutation.mutate({
      cycleId,
      employeeId: selectedEmployeeId,
      reviewType,
    });
  };

  return (
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetContent className="overflow-y-auto p-6 sm:max-w-xl">
        <SheetHeader className="pb-6">
          <SheetTitle className="font-bold text-2xl">
            Add Performance Review
          </SheetTitle>
          <SheetDescription>
            Create a new performance review for an employee in this cycle.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Employee Selection */}
          <div className="space-y-2">
            <Label>
              Employee <span className="text-destructive">*</span>
            </Label>
            <UserSearchCombobox
              onChange={(val) => setSelectedEmployeeId(val ?? "")}
              placeholder="Search for an employee..."
              value={selectedEmployeeId || null}
            />
          </div>

          {/* Review Type */}
          <div className="space-y-2">
            <Label>Review Type</Label>
            <Select
              onValueChange={(val) => setReviewType(val as ReviewType)}
              value={reviewType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select review type" />
              </SelectTrigger>
              <SelectContent>
                {REVIEW_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t pt-6">
            <Button
              onClick={() => {
                setOpen(false);
                router.back();
              }}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedEmployeeId || createReviewMutation.isPending}
              onClick={handleSubmit}
            >
              {createReviewMutation.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Create Review
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
