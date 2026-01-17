"use client";

import { COMPETENCY_RATINGS } from "@zenith-hr/api/modules/performance/performance.schema";
import { AlertCircle } from "lucide-react";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { usePerformanceReviewFormContext } from "../performance-review-form-context";

interface Competency {
  id: string;
  name: string;
  description: string | null;
  weight: number;
  rating: number | null;
  justification: string | null;
}

interface CompetencyRatingsSectionProps {
  competencies: Competency[];
}

export function CompetencyRatingsSection({
  competencies,
}: CompetencyRatingsSectionProps) {
  // Calculate weighted percentage for display
  const totalWeight = competencies.reduce((sum, c) => sum + c.weight, 0);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-muted-foreground text-sm uppercase tracking-wider">
          Core Competencies
        </h3>
        <span className="text-muted-foreground text-xs">
          Weighted: {totalWeight}%
        </span>
      </div>

      <div className="space-y-4">
        {competencies.map((competency, index) => (
          <CompetencyRatingCard
            competency={competency}
            index={index}
            key={competency.id}
          />
        ))}
      </div>
    </section>
  );
}

interface CompetencyRatingCardProps {
  competency: Competency;
  index: number;
}

function CompetencyRatingCard({
  competency,
  index,
}: CompetencyRatingCardProps) {
  const { form } = usePerformanceReviewFormContext();
  const [localRating, setLocalRating] = useState<number | undefined>(
    competency.rating ?? undefined,
  );
  const [localJustification, setLocalJustification] = useState<string>(
    competency.justification || "",
  );

  const handleRatingChange = (rating: number) => {
    setLocalRating(rating);
    // Update the form state
    const competencyRatings = form.state.values.competencyRatings || [];
    const updatedRatings = [...competencyRatings];
    if (updatedRatings[index]) {
      updatedRatings[index] = {
        ...updatedRatings[index],
        rating,
      };
    } else {
      updatedRatings[index] = {
        competencyId: competency.id,
        rating,
        justification: "",
      };
    }
    form.setFieldValue("competencyRatings", updatedRatings);
  };

  const handleJustificationChange = (justification: string) => {
    setLocalJustification(justification);
    // Update the form state
    const competencyRatings = form.state.values.competencyRatings || [];
    const updatedRatings = [...competencyRatings];
    if (updatedRatings[index]) {
      updatedRatings[index] = {
        ...updatedRatings[index],
        justification,
      };
    } else {
      updatedRatings[index] = {
        competencyId: competency.id,
        rating: undefined,
        justification,
      };
    }
    form.setFieldValue("competencyRatings", updatedRatings);
  };

  const requiresJustification = localRating !== undefined && localRating < 3;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{competency.name}</CardTitle>
            {competency.description && (
              <CardDescription className="mt-1">
                {competency.description}
              </CardDescription>
            )}
          </div>
          <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground text-xs">
            {competency.weight}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rating Buttons */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {COMPETENCY_RATINGS.map((rating) => (
              <button
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg border font-medium text-sm transition-all",
                  localRating === rating.value
                    ? getRatingButtonActiveClass(rating.value)
                    : "hover:bg-muted",
                )}
                key={rating.value}
                onClick={() => handleRatingChange(rating.value)}
                title={rating.label}
                type="button"
              >
                {rating.value}
              </button>
            ))}
          </div>

          {localRating !== undefined && (
            <p className={cn("text-sm", getRatingTextClass(localRating))}>
              {COMPETENCY_RATINGS.find((r) => r.value === localRating)?.label}
            </p>
          )}

          {/* Justification Required Alert */}
          {requiresJustification && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-destructive text-xs">
              <AlertCircle className="size-4" />
              Justification required for this rating
            </div>
          )}
        </div>

        {/* Justification Textarea - Show when rating is below expectations */}
        {requiresJustification && (
          <div className="space-y-2">
            <Label className="text-destructive text-xs">
              Please explain why the rating is low *
            </Label>
            <Textarea
              className="min-h-20"
              onChange={(e) => handleJustificationChange(e.target.value)}
              placeholder="Provide specific examples and areas for improvement..."
              value={localJustification}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getRatingButtonActiveClass(rating: number): string {
  switch (rating) {
    case 1:
      return "border-red-500 bg-red-500 text-white";
    case 2:
      return "border-orange-500 bg-orange-500 text-white";
    case 3:
      return "border-yellow-500 bg-yellow-500 text-white";
    case 4:
      return "border-green-500 bg-green-500 text-white";
    case 5:
      return "border-blue-500 bg-blue-500 text-white";
    default:
      return "";
  }
}

function getRatingTextClass(rating: number): string {
  switch (rating) {
    case 1:
      return "text-red-600";
    case 2:
      return "text-orange-600";
    case 3:
      return "text-yellow-600";
    case 4:
      return "text-green-600";
    case 5:
      return "text-blue-600";
    default:
      return "";
  }
}
