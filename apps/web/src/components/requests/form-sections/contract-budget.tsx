import { FormField } from "@/components/shared/form-field";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONTRACT_DURATIONS } from "../manpower-request-form.constants";
import type { ManpowerRequestFormType } from "../types";

type SectionProps = {
  form: ManpowerRequestFormType;
};

export function ContractBudgetSection({ form }: SectionProps) {
  return (
    <section className="space-y-6">
      <h3 className="font-bold text-muted-foreground text-sm uppercase tracking-wider">
        Contract & Budget
      </h3>

      <form.Field name="isBudgeted">
        {(field) => (
          <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
            <Checkbox
              checked={field.state.value ?? false}
              id={field.name}
              onCheckedChange={() => field.handleChange(true)}
            />
            <div className="space-y-1 leading-none">
              <Label className="font-semibold" htmlFor={field.name}>
                Is this position budgeted?
              </Label>
              <p className="text-muted-foreground text-xs">
                Uncheck if this request requires extraordinary budget approval.
              </p>
            </div>
          </div>
        )}
      </form.Field>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <form.Field name="contractDuration">
          {(field) => (
            <FormField field={field} label="Contract Duration" required>
              <Select
                onValueChange={(val) =>
                  field.handleChange(
                    val as "FULL_TIME" | "TEMPORARY" | "CONSULTANT",
                  )
                }
                value={field.state.value}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
        </form.Field>

        <div className="space-y-2">
          <Label>
            Monthly Salary Range (QAR){" "}
            <span className="text-destructive">*</span>
          </Label>
          <div className="flex items-center gap-2">
            <form.Field name="salaryRangeMin">
              {(field) => (
                <div className="flex-1">
                  <Input
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.handleChange(val === "" ? 0 : Number(val));
                    }}
                    placeholder="Min"
                    type="number"
                    value={field.state.value || ""}
                  />
                </div>
              )}
            </form.Field>
            <span className="text-muted-foreground">-</span>
            <form.Field name="salaryRangeMax">
              {(field) => (
                <div className="flex-1">
                  <Input
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.handleChange(val === "" ? 0 : Number(val));
                    }}
                    placeholder="Max"
                    type="number"
                    value={field.state.value || ""}
                  />
                </div>
              )}
            </form.Field>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Enter base salary only.
          </p>
          <form.Subscribe
            selector={(state) => [
              state.fieldMeta.salaryRangeMin,
              state.fieldMeta.salaryRangeMax,
            ]}
          >
            {([minMeta, maxMeta]) => {
              const formatErrors = (errors: unknown[]) =>
                errors
                  .map((e) =>
                    typeof e === "string"
                      ? e
                      : ((e as { message?: string })?.message ?? ""),
                  )
                  .filter(Boolean)
                  .join(", ");
              return (
                <div className="space-y-1">
                  {minMeta?.errors?.length ? (
                    <p className="text-destructive text-xs">
                      {formatErrors(minMeta.errors)}
                    </p>
                  ) : null}
                  {maxMeta?.errors?.length ? (
                    <p className="text-destructive text-xs">
                      {formatErrors(maxMeta.errors)}
                    </p>
                  ) : null}
                </div>
              );
            }}
          </form.Subscribe>
        </div>
      </div>
    </section>
  );
}
