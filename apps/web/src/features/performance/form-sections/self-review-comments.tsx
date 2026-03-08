"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePerformanceReviewFormContext } from "../performance-review-form-context";

export function SelfReviewCommentsSection() {
  const { form, permissions } = usePerformanceReviewFormContext();

  return (
    <section className="space-y-4">
      <h3 className="font-bold text-muted-foreground text-sm uppercase tracking-wider">
        Self Review
      </h3>

      <form.Field name="selfComment">
        {(field: {
          name: string;
          state: { value: string };
          handleBlur: () => void;
          handleChange: (value: string) => void;
        }) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>
              Summarize your contributions, outcomes, and any blockers from this
              review period.
            </Label>
            <Textarea
              className="min-h-36"
              disabled={!permissions.canEditSelfComment}
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Describe your achievements, challenges, and support needed..."
              readOnly={!permissions.canEditSelfComment}
              value={field.state.value || ""}
            />
            {!permissions.canEditSelfComment && field.state.value && (
              <p className="text-muted-foreground text-xs">Read only</p>
            )}
          </div>
        )}
      </form.Field>
    </section>
  );
}
