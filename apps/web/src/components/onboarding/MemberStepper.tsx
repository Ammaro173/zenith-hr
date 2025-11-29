"use client";

import { useForm } from "@tanstack/react-form";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";
import FieldInfo from "@/components/shared/field-info";
import { Checkbox } from "@/components/ui/checkbox";
import { CountryDropdown } from "@/components/ui/country-dropdown";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import type { ErrorResponseSchema } from "@/contracts/common/schema";
import { getErrorMessage } from "@/contracts/common/schema";
import type {
  Member,
  SubmitMemberBody,
  Vehicle,
} from "@/contracts/member/schema";
import { submitMemberBodySchema } from "@/contracts/member/schema";
import { QAT_PHONE_PREFIX } from "@/lib/constants";
import { tsr } from "@/lib/react-qeury-utils/tsr";
import { For, tryCatch } from "@/utils";
import { type Step, Stepper } from "./Stepper";

type Props = { id: string; member?: Member; vehicle?: Vehicle };
const memberSubmitSchema = submitMemberBodySchema;
type MemberFormValues = SubmitMemberBody;

export function MemberStepper({ id, member, vehicle }: Props) {
  const router = useRouter();
  const { mutateAsync: submitMember, isPending } =
    tsr.members.submit.useMutation();

  const defaultValues = useMemo<MemberFormValues>(
    () => ({
      firstName: member?.firstName ?? "",
      lastName: member?.lastName ?? "",
      email: member?.email ?? "",
      phone: member?.phone ?? QAT_PHONE_PREFIX,
      nationality: member?.nationality ?? undefined,
      // qid: member?.qid ?? "",
      // make: vehicle?.make ?? undefined,
      model: vehicle?.model ?? undefined,
      year: vehicle?.year ?? undefined,
      // vinNumber: vehicle?.vinNumber ?? undefined,
      dataProcessingConsent: member?.dataProcessingConsent ?? false,
      marketingOptIn: member?.marketingOptIn ?? false,
    }),
    [member, vehicle]
  );

  const form = useForm({
    defaultValues,
    validators: { onSubmit: memberSubmitSchema },
    onSubmitInvalid: () => {
      toast.error("Please review your entries");
    },
    onSubmit: async ({ value }) => {
      const payload: SubmitMemberBody = {
        firstName: value.firstName,
        lastName: value.lastName,
        email: value.email,
        phone: value.phone,
        nationality: value.nationality,
        // qid: value.qid ?? undefined,
        // make: value.make,
        model: value.model,
        year: value.year,
        // vinNumber: value.vinNumber,
        dataProcessingConsent: value.dataProcessingConsent,
        marketingOptIn: value.marketingOptIn ?? false,
      };
      const { isSuccess, error } = await tryCatch(
        submitMember({ params: { id }, body: payload })
      );

      if (!isSuccess) {
        toast.error("Submission failed", {
          description: getErrorMessage(error as unknown as ErrorResponseSchema),
        });
        return;
      }
      router.replace(`/invite/${id}/success` as Route);
    },
  });

  const steps: Step[] = [
    {
      id: "welcome",
      title: "Welcome to Audi Members Club",
      subtitle: "Fill in your details",
      label: "Welcome",
      hideContent: true,
      canNext: true,
      render: () => null,
    },
    {
      id: "personal",
      title: "Personal Information",
      subtitle: "Fill in your personal details.",
      label: "Personal",
      render: () => (
        <div className="grid gap-3">
          <form.Field name="firstName">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label className="text-primary text-sm" htmlFor={field.name}>
                  First Name
                </Label>
                <Input
                  className="text-primary"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value ?? ""}
                />
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field>

          <form.Field name="lastName">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label className="text-primary text-sm" htmlFor={field.name}>
                  Last Name
                </Label>
                <Input
                  className="text-primary"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value ?? ""}
                />
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field>

          <form.Field name="email">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label className="text-primary text-sm" htmlFor={field.name}>
                  Email
                </Label>
                <Input
                  className="text-primary"
                  disabled={!!member?.email}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    const value = event.target.value;
                    field.handleChange(value);
                  }}
                  type="email"
                  value={field.state.value}
                />
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field>

          <form.Field name="phone">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label className="text-primary text-sm" htmlFor={field.name}>
                  Phone Number
                </Label>
                <PhoneInput
                  className="text-primary"
                  disabled={!!member?.phone}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(value) => field.handleChange(value)}
                  value={field.state.value ?? ""}
                />
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field>

          <form.Field name="nationality">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label className="text-primary text-sm" htmlFor={field.name}>
                  Nationality
                </Label>
                <CountryDropdown
                  defaultValue={field.state.value}
                  onChange={(countryName) => field.handleChange(countryName)}
                  placeholder="Select nationality"
                />
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field>

          {/* <form.Field name="qid">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm text-primary" htmlFor={field.name}>
                  QID Number
                </Label>
                <Input
                  className="text-primary"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value ?? ""}
                />
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field> */}
        </div>
      ),
    },
    {
      id: "vehicle",
      title: "Vehicle Information",
      subtitle: "Fill in your vehicle details.",
      label: "Vehicle",
      render: () => (
        <div className="grid gap-3">
          {/* <form.Field name="make">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm text-primary" htmlFor={field.name}>
                  Car Model
                </Label>
                <Input
                  className="text-primary"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value ?? ""}
                />
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field> */}

          <form.Field name="model">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label className="text-primary text-sm" htmlFor={field.name}>
                  Model
                </Label>
                <Input
                  className="text-primary"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value ?? ""}
                />
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field>

          <form.Field name="year">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label className="text-primary text-sm" htmlFor={field.name}>
                  Year
                </Label>
                <Input
                  className="text-primary"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    const input = event.target.value;
                    if (input === "") {
                      field.handleChange(undefined);
                      return;
                    }

                    const parsed = Number(input);
                    field.handleChange(
                      Number.isNaN(parsed) ? undefined : parsed
                    );
                  }}
                  type="number"
                  value={field.state.value ?? ""}
                />
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field>

          {/* <form.Field name="vinNumber">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm text-primary" htmlFor={field.name}>
                  VIN Number
                </Label>
                <Input
                  className="text-primary"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value ?? ""}
                />
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field> */}
        </div>
      ),
    },
    {
      id: "review",
      title: "Review & Submit",
      subtitle: "Confirm everything looks correct.",
      label: "Review",
      render: () => (
        <form.Subscribe selector={(s) => s.values}>
          {(values) => {
            const personalEntries = [
              { label: "First name", value: values.firstName },
              { label: "Last name", value: values.lastName },
              { label: "Email", value: values.email },
              { label: "Phone Number", value: values.phone },
              { label: "Nationality", value: values.nationality },
              // { label: "QID", value: values.qid },
            ];

            const vehicleEntries = [
              // { label: "Make", value: values.make },
              { label: "Model", value: values.model },
              {
                label: "Year",
                value:
                  values.year === undefined || values.year === null
                    ? undefined
                    : `${values.year}`,
              },
              // { label: "VIN Number", value: values.vinNumber },
            ];

            return (
              <div className="space-y-6 text-muted-foreground text-sm">
                <p>
                  We will submit the provided details to create your membership.
                </p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Personal</p>
                    <div className="grid gap-2">
                      <For
                        each={personalEntries}
                        render={(entry) => (
                          <div
                            className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-card-foreground"
                            key={entry.label}
                          >
                            <span className="font-medium text-foreground">
                              {entry.label}
                            </span>
                            <span>{`${entry.value}`}</span>
                          </div>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Vehicle</p>
                    <div className="grid gap-2">
                      <For
                        each={vehicleEntries}
                        render={(entry) => (
                          <div
                            className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-card-foreground"
                            key={entry.label}
                          >
                            <span className="font-medium text-foreground">
                              {entry.label}
                            </span>
                            <span>{`${entry.value}`}</span>
                          </div>
                        )}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <form.Field name="dataProcessingConsent">
                    {(field) => (
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-3 text-card-foreground">
                          <Checkbox
                            checked={field.state.value ?? false}
                            id={field.name}
                            name={field.name}
                            onCheckedChange={(checked) =>
                              field.handleChange(checked === true)
                            }
                          />
                          <Label
                            className="flex-1 text-foreground text-sm leading-relaxed"
                            htmlFor={field.name}
                          >
                            I confirm that all the information I have provided
                            is true and accurate. I authorize Q-Auto to collect
                            and use my personal data to process my membership
                            and provide related services, in line with the
                            company's Privacy Policy.
                          </Label>
                        </div>
                        <FieldInfo field={field} />
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="marketingOptIn">
                    {(field) => (
                      <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-3 text-card-foreground">
                        <Checkbox
                          checked={field.state.value ?? false}
                          id={field.name}
                          name={field.name}
                          onCheckedChange={(checked) =>
                            field.handleChange(checked === true)
                          }
                        />
                        <Label
                          className="flex-1 text-foreground text-sm leading-relaxed"
                          htmlFor={field.name}
                        >
                          I agree to receive promotional updates, offers, and
                          marketing communications from Q-Auto through email,
                          SMS, or other channels.
                        </Label>
                      </div>
                    )}
                  </form.Field>
                </div>
              </div>
            );
          }}
        </form.Subscribe>
      ),
    },
  ];

  return (
    <form.Subscribe
      selector={(s) => ({ isSubmitting: s.isSubmitting, values: s.values })}
    >
      {({ isSubmitting }) => (
        <Stepper
          isSubmitting={isPending || isSubmitting}
          logo="/images/audi-club.svg"
          onSubmit={() => form.handleSubmit()}
          startLabel="Lets Start"
          steps={steps}
        />
      )}
    </form.Subscribe>
  );
}
