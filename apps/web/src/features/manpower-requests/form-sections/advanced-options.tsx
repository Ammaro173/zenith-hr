import { format } from "date-fns";
import { CalendarIcon, ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import * as React from "react";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Show } from "@/utils";
import { useManpowerRequestFormContext } from "../manpower-request-form-context";

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

          {/* <div className="space-y-4">
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

          <Separator /> */}

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

            {/* <form.Field name="positionDetails.reportingTo">
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
            </form.Field> */}

            <form.Field name="positionDetails.startDate">
              {(field) => (
                <FormField field={field} label="Target Start Date">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.state.value && "text-muted-foreground",
                        )}
                        type="button"
                        variant="outline"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.state.value ? (
                          format(new Date(field.state.value), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        initialFocus
                        mode="single"
                        onSelect={(date) => {
                          if (date) {
                            field.handleChange(format(date, "yyyy-MM-dd"));
                          }
                        }}
                        selected={
                          field.state.value
                            ? new Date(field.state.value)
                            : undefined
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </FormField>
              )}
            </form.Field>
          </div>
        </div>
      )}
    </section>
  );
}
