import {
  CONTRACT_DURATIONS,
  EMPLOYMENT_TYPES,
} from "@zenith-hr/api/modules/requests/requests.schema";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useManpowerRequestFormContext } from "../manpower-request-form-context";

export function ContractBudgetSection() {
  const { form } = useManpowerRequestFormContext();

  return (
    <section className="space-y-6">
      <h3 className="font-bold text-muted-foreground text-sm uppercase tracking-wider">
        Contract & Budget
      </h3>

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

        <form.Field name="employmentType">
          {(field) => (
            <FormField field={field} label="Employment Type" required>
              <Select
                onValueChange={(val) =>
                  field.handleChange(
                    val as
                      | "FULL_TIME"
                      | "PART_TIME"
                      | "FREELANCER"
                      | "FIXED_TERM_CONTRACT"
                      | "TEMPORARY",
                  )
                }
                value={field.state.value}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue placeholder="Select employment type" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
        </form.Field>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <form.Field name="headcount">
          {(field) => (
            <FormField
              field={field}
              label="Number of Manpower Requested"
              required
            >
              <Input
                id={field.name}
                min={1}
                onBlur={field.handleBlur}
                onChange={(e) => {
                  const val = e.target.value;
                  field.handleChange(val === "" ? 1 : Number(val));
                }}
                placeholder="e.g. 1"
                type="number"
                value={field.state.value || 1}
              />
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
                  .map((error) =>
                    typeof error === "string"
                      ? error
                      : ((error as { message?: string })?.message ?? ""),
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
