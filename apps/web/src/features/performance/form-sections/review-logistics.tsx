import { REVIEW_TYPES } from "@zenith-hr/api/modules/performance/performance.schema";
import { format } from "date-fns";
import { Calendar, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ReviewLogisticsSectionProps {
  review: {
    reviewType: string;
    reviewPeriodStart?: Date | string | null;
    reviewPeriodEnd?: Date | string | null;
    reviewer?: {
      id: string;
      name: string | null;
      email: string;
    } | null;
    cycle?: {
      name: string;
    } | null;
  };
}

export function ReviewLogisticsSection({
  review,
}: ReviewLogisticsSectionProps) {
  const reviewTypeLabel =
    REVIEW_TYPES.find((t) => t.value === review.reviewType)?.label ||
    review.reviewType;

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) {
      return "Not set";
    }
    return format(new Date(date), "MMM d, yyyy");
  };

  return (
    <section className="space-y-4">
      <h3 className="font-bold text-muted-foreground text-sm uppercase tracking-wider">
        Review Logistics
      </h3>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{reviewTypeLabel}</CardTitle>
          {review.cycle && (
            <CardDescription>Cycle: {review.cycle.name}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-3">
            <Calendar className="size-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Review Period</p>
              <p className="font-medium text-sm">
                {formatDate(review.reviewPeriodStart)} -{" "}
                {formatDate(review.reviewPeriodEnd)}
              </p>
            </div>
          </div>

          {review.reviewer && (
            <div className="flex items-center gap-3">
              <User className="size-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Reviewer</p>
                <p className="font-medium text-sm">
                  {review.reviewer.name || review.reviewer.email}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
