import { ChevronDown, ChevronUp, Settings2, UserCheck } from "lucide-react";
import * as React from "react";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Show } from "@/utils";
import { useManpowerRequestFormContext } from "../manpower-request-form-context";
import { UserSearchCombobox } from "../user-search-combobox";

export function AdvancedOptionsSection() {
  const { form } = useManpowerRequestFormContext();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <section className="space-y-4 rounded-xl border bg-muted/30 p-4 transition-all">
      <Button
        className="flex w-full items-center justify-between hover:no-underline"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        variant="ghost"
      >
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Settings2 className="size-4" />
          Advanced & Workflow Options
        </div>
        <Show>
          <Show.When isTrue={isOpen}>
            <ChevronUp className="size-4 text-muted-foreground" />
          </Show.When>
          <Show.Else>
            <ChevronDown className="size-4 text-muted-foreground" />
          </Show.Else>
        </Show>
      </Button>

      {isOpen && (
        <div className="space-y-6 pt-4">
          <Separator />

          <div className="space-y-4">
            <div className="flex items-center gap-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
              <UserCheck className="size-3" />
              Workflow Overrides
            </div>
            <div className="grid grid-cols-1 gap-4">
              <form.Field name="approverId">
                {(field) => (
                  <FormField
                    description="Optionally override the initial approver if hierarchy calculation is not desired."
                    field={field}
                    label="Select Initial Approver"
                  >
                    <UserSearchCombobox
                      onChange={field.handleChange}
                      value={field.state.value}
                    />
                  </FormField>
                )}
              </form.Field>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <form.Field name="positionDetails.location">
              {(field) => (
                <FormField field={field} label="Work Location">
                  <Input
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. Doha, Qatar"
                    value={field.state.value}
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field name="positionDetails.reportingTo">
              {(field) => (
                <FormField field={field} label="Reporting To">
                  <Input
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Manager Name or Position"
                    value={field.state.value}
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field name="positionDetails.startDate">
              {(field) => (
                <FormField field={field} label="Target Start Date">
                  <Input
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    type="date"
                    value={field.state.value}
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field name="budgetDetails.costCenter">
              {(field) => (
                <FormField field={field} label="Cost Center">
                  <Input
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. CC-123"
                    value={field.state.value}
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field name="budgetDetails.budgetCode">
              {(field) => (
                <FormField field={field} label="Budget Code">
                  <Input
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. BC-456"
                    value={field.state.value}
                  />
                </FormField>
              )}
            </form.Field>
          </div>
        </div>
      )}
    </section>
  );
}
