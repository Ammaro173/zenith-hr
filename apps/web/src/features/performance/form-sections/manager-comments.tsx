"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePerformanceReviewFormContext } from "../performance-review-form-context";

export function ManagerCommentsSection() {
  const { form } = usePerformanceReviewFormContext();

  return (
    <section className="space-y-4">
      <h3 className="font-bold text-muted-foreground text-sm uppercase tracking-wider">
        Manager Comments
      </h3>

      <form.Field name="managerComment">
        {(field: {
          name: string;
          state: { value: string };
          handleBlur: () => void;
          handleChange: (value: string) => void;
        }) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>
              Write your detailed summary here. Highlight specific achievements
              and areas for improvement.
            </Label>
            <Textarea
              className="min-h-36"
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Enter your overall assessment of the employee's performance..."
              value={field.state.value || ""}
            />
            <p className="text-muted-foreground text-xs">
              Use formatting: <strong>**bold**</strong> for emphasis,{" "}
              <em>*italic*</em> for notes
            </p>
          </div>
        )}
      </form.Field>
    </section>
  );
}
