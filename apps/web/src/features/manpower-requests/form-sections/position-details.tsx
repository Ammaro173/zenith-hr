import { REQUEST_TYPES } from "@zenith-hr/api/modules/requests/requests.schema";
import { Info } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { PositionCombobox } from "@/components/shared/position-combobox";
import { UserSearchCombobox } from "@/components/shared/user-search-combobox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useManpowerRequestFormContext } from "../manpower-request-form-context";

export function PositionDetailsSection() {
  const { form } = useManpowerRequestFormContext();

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-muted-foreground text-sm uppercase tracking-wider">
          Position Details
        </h3>
      </div>

      <form.Field name="positionId">
        {(field) => (
          <FormField field={field} label="Position" required>
            <PositionCombobox
              onChange={(id) => field.handleChange(id ?? "")}
              placeholder="Search positions..."
              value={field.state.value}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="requestType">
        {(field) => (
          <div className="space-y-2">
            <Label>
              Request Type <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
              onValueChange={(val) =>
                field.handleChange(val as "NEW_POSITION" | "REPLACEMENT")
              }
              value={field.state.value}
            >
              {REQUEST_TYPES.map((type) => (
                <Label
                  className={cn(
                    "relative flex cursor-pointer flex-col items-start gap-2 rounded-lg border p-4 font-normal transition-colors",
                    field.state.value === type.value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted",
                  )}
                  htmlFor={type.value}
                  key={type.value}
                >
                  <div className="flex w-full items-center justify-between text-left">
                    <div className="font-semibold">{type.label}</div>
                    <RadioGroupItem id={type.value} value={type.value} />
                  </div>
                  <div className="text-left text-muted-foreground text-xs">
                    {type.description}
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </div>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.values.requestType}>
        {(requestType) => {
          if (requestType !== "REPLACEMENT") {
            return null;
          }
          return (
            <form.Field name="replacementForUserId">
              {(field) => (
                <div className="space-y-2 rounded-lg border border-dashed bg-muted/30 p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground text-xs">
                    <Info className="size-3 text-blue-500" />
                    Replacement details are mandatory for this request type
                  </div>
                  <FormField
                    field={field}
                    label="Select User to Replace"
                    required
                  >
                    <UserSearchCombobox
                      onChange={field.handleChange}
                      value={field.state.value}
                    />
                  </FormField>
                </div>
              )}
            </form.Field>
          );
        }}
      </form.Subscribe>
    </section>
  );
}
