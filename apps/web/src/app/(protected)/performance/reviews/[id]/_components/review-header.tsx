import { REVIEW_TYPES } from "@zenith-hr/api/modules/performance/performance.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReviewHeaderProps {
  review: {
    id: string;
    reviewType: string;
    status: string;
    employee: {
      name: string | null;
    };
    cycle?: {
      id: string;
      name: string;
    } | null;
  };
}

export function ReviewHeader({ review }: ReviewHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-2xl tracking-tight">
            Performance Review
          </h1>
          <StatusBadge status={review.status} />
        </div>
        <p className="mt-1 text-muted-foreground">
          {review.employee.name}'s{" "}
          {REVIEW_TYPES.find((t) => t.value === review.reviewType)?.label ||
            review.reviewType}
        </p>
      </div>

      {/* Review Type Tabs */}
      <div className="flex gap-2">
        {REVIEW_TYPES.map((type) => (
          <Button
            asChild={type.value !== review.reviewType}
            className={cn(
              type.value === review.reviewType
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80",
            )}
            key={type.value}
            size="sm"
            variant={type.value === review.reviewType ? "default" : "outline"}
          >
            {type.value === review.reviewType ? (
              <span>{type.label}</span>
            ) : (
              <span className="cursor-default opacity-50">{type.label}</span>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const getVariant = () => {
    switch (status) {
      case "DRAFT":
        return "secondary";
      case "SUBMITTED":
      case "COMPLETED":
        return "default";
      case "IN_REVIEW":
      case "MANAGER_REVIEW":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getLabel = () => {
    return status
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  return <Badge variant={getVariant()}>{getLabel()}</Badge>;
}
