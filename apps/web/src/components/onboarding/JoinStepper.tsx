"use client";

import { useForm } from "@tanstack/react-form";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";
import z from "zod";
import FieldInfo from "@/components/shared/field-info";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import type { ErrorResponseSchema } from "@/contracts/common/schema";
import { getErrorMessage } from "@/contracts/common/schema";
import type { JoinBody } from "@/contracts/interested/schema";
import { joinBodySchema } from "@/contracts/interested/schema";
import { QAT_PHONE_PREFIX } from "@/lib/constants";
import { tsr } from "@/lib/react-qeury-utils/tsr";
import { For, tryCatch } from "@/utils";
import { Checkbox } from "../ui/checkbox";
import { type Step, Stepper } from "./Stepper";

type JoinFormValues = JoinBody & { dataProcessingConsent: boolean };

export function JoinStepper() {
  const router = useRouter();
  const { mutateAsync: submitJoin, isPending } =
    tsr.interested.join.useMutation();

  const defaultValues = useMemo<JoinFormValues>(
    () => ({
      firstName: "",
      lastName: "",
      email: "",
      phone: QAT_PHONE_PREFIX,
      model: "",
      dataProcessingConsent: false,
    }),
    []
  );

  const joinFormSchema = joinBodySchema.extend({
    dataProcessingConsent: z.boolean().refine((val: boolean) => val === true, {
      message: "You must agree to the data processing terms",
    }),
  });

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: joinFormSchema,
    },
    onSubmitInvalid: () => {
      toast.error("Please review your entries");
    },
    onSubmit: async ({ value }) => {
      const payload: JoinBody = {
        firstName: value.firstName,
        lastName: value.lastName,
        email: value.email,
        phone: value.phone,
        model: value.model,
      };
      const { isSuccess, error } = await tryCatch(
        submitJoin({ body: payload })
      );

      if (!isSuccess) {
        toast.error("Submission failed", {
          description: getErrorMessage(error as unknown as ErrorResponseSchema),
        });
        return;
      }
      router.replace("/join/success" as Route);
    },
  });

  const steps: Step[] = [
    {
      id: "welcome",
      title: "Join the Audi Club",
      subtitle:
        "Be part of the Audi Club community and enjoy exclusive benefits, offers, and events. Fill in your details below, and our team will reach out to you soon.",
      label: "Welcome",
      hideContent: true,
      hideSubtitle: true,
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
                <Label className="text-sm text-white" htmlFor={field.name}>
                  First Name
                </Label>
                <Input
                  className="text-white"
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
                <Label className="text-sm text-white" htmlFor={field.name}>
                  Last Name
                </Label>
                <Input
                  className="text-white"
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
                <Label className="text-sm text-white" htmlFor={field.name}>
                  Email
                </Label>
                <Input
                  className="text-white"
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
                <Label className="text-sm text-white" htmlFor={field.name}>
                  Phone Number
                </Label>
                <PhoneInput
                  className="text-white"
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

          <form.Field name="model">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm text-white" htmlFor={field.name}>
                  Car Model
                </Label>
                <Input
                  className="text-white"
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
            ];

            return (
              <div className="space-y-6 text-muted-foreground text-sm">
                <p>
                  We will submit the provided details to express your interest
                  in joining the club.
                </p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">
                      Personal Information
                    </p>
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
                            and use my personal data in line with the company's
                            Privacy Policy.
                          </Label>
                        </div>
                        <FieldInfo field={field} />
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
          startLabel="Let's Start"
          steps={steps}
        />
      )}
    </form.Subscribe>
  );
}
