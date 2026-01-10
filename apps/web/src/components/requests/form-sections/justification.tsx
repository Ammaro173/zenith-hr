import { FormField } from "@/components/shared/form-field";
import { Textarea } from "@/components/ui/textarea";
import type { ManpowerRequestFormType } from "../types";

type SectionProps = {
  form: ManpowerRequestFormType;
};

export function JustificationSection({ form }: SectionProps) {
  return (
    <section className="space-y-4">
      <h3 className="font-bold text-muted-foreground text-sm uppercase tracking-wider">
        Justification
      </h3>

      <form.Field name="justificationText">
        {(field) => (
          <FormField field={field} label="Reason for Request" required>
            <div className="space-y-2">
              <Textarea
                className="min-h-[120px]"
                id={field.name}
                maxLength={500}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Please explain why this position is needed, impact of not hiring, and key responsibilities..."
                value={field.state.value}
              />
              <div className="flex justify-end text-[10px] text-muted-foreground">
                {field.state.value.length} / 500 characters
              </div>
            </div>
          </FormField>
        )}
      </form.Field>
    </section>
  );
}
