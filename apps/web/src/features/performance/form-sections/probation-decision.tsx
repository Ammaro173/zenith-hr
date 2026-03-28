"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePerformanceReviewFormContext } from "../performance-review-form-context";

export function ProbationDecisionSection() {
  const { form, permissions, formReadOnly } = usePerformanceReviewFormContext();
  const disabledSelect = formReadOnly || !permissions.canEditProbationDecision;
  const disabledComment = formReadOnly || !permissions.canEditManagerComment;

  return (
    <div className="space-y-6 rounded-lg border bg-blue-50/30 p-6 dark:bg-blue-950/10">
      <div>
        <h3 className="font-semibold text-lg">Probation Decision</h3>
        <p className="text-muted-foreground text-sm">
          Please provide the final recommendation for this probation period.
        </p>
      </div>

      <form.Field name="probationConfirmationDecision">
        {(field: {
          name: string;
          state: {
            value:
              | "CONFIRM_EMPLOYMENT"
              | "EXTEND_PROBATION"
              | "RECOMMEND_TERMINATION"
              | undefined;
          };
          handleChange: (
            value:
              | "CONFIRM_EMPLOYMENT"
              | "EXTEND_PROBATION"
              | "RECOMMEND_TERMINATION",
          ) => void;
        }) => (
          <div className="grid gap-2 md:max-w-sm">
            <Label htmlFor={field.name}>Recommendation</Label>
            <Select
              disabled={disabledSelect}
              onValueChange={field.handleChange}
              value={field.state.value}
            >
              <SelectTrigger className="bg-background" id={field.name}>
                <SelectValue placeholder="Select a decision..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONFIRM_EMPLOYMENT">
                  Confirm Employment
                </SelectItem>
                <SelectItem value="EXTEND_PROBATION">
                  Extend Probation
                </SelectItem>
                <SelectItem value="RECOMMEND_TERMINATION">
                  Recommend Termination
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </form.Field>

      <form.Field name="probationDecisionComment">
        {(field: {
          name: string;
          state: { value: string };
          handleBlur: () => void;
          handleChange: (value: string) => void;
        }) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Final Decision Comments</Label>
            <Textarea
              className="bg-background"
              disabled={disabledComment}
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Provide justification for the probation decision..."
              readOnly={disabledComment}
              rows={4}
              value={field.state.value}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="probationStrengthness">
        {(field: {
          name: string;
          state: { value: string };
          handleBlur: () => void;
          handleChange: (value: string) => void;
        }) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Stongness</Label>
            <Textarea
              className="bg-background"
              disabled={disabledComment}
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="List key strengths shown during probation..."
              readOnly={disabledComment}
              rows={3}
              value={field.state.value}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="probationWeakness">
        {(field: {
          name: string;
          state: { value: string };
          handleBlur: () => void;
          handleChange: (value: string) => void;
        }) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Weakness</Label>
            <Textarea
              className="bg-background"
              disabled={disabledComment}
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="List areas that need improvement..."
              readOnly={disabledComment}
              rows={3}
              value={field.state.value}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="probationPerformanceRate">
        {(field: {
          name: string;
          state: { value: string };
          handleBlur: () => void;
          handleChange: (value: string) => void;
        }) => (
          <div className="grid gap-2 md:max-w-sm">
            <Label htmlFor={field.name}>Performance rete</Label>
            <Input
              className="bg-background"
              disabled={disabledComment}
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="e.g., 4/5 or 80%"
              readOnly={disabledComment}
              value={field.state.value}
            />
          </div>
        )}
      </form.Field>
    </div>
  );
}
