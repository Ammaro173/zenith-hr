"use client";

import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { toast } from "sonner";
import { z } from "zod";
import FieldInfo from "@/components/shared/field-info";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { authClient } from "@/lib/auth-client";
import { getErrorMessage } from "@/lib/handle-error";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export function ForgotPasswordForm() {
  const form = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onSubmit: forgotPasswordSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      await authClient.requestPasswordReset(
        {
          email: value.email,
          redirectTo: "/reset-password",
        },
        {
          onSuccess: () => {
            toast.success("Check your inbox", {
              description:
                "If that email is registered, a reset link is on its way.",
            });
            formApi.setFieldValue("email", "");
          },
          onError: (error: unknown) => {
            if (error instanceof Error) {
              toast.error("Reset request failed", {
                description: getErrorMessage(error),
              });
            } else {
              toast.error("Reset request failed");
            }
          },
        },
      );
    },
  });

  return (
    <div className="relative grid min-h-screen place-items-center">
      <Card className="w-full max-w-lg gap-0 rounded-none border border-white/25 bg-background p-12 text-start">
        <CardHeader className="gap-3 px-0 text-start">
          <CardTitle className="font-semibold text-4xl">
            Forgot Password
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            Enter your email and we&apos;ll send a link to reset your password.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-0 pt-8">
          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              form.handleSubmit();
            }}
          >
            <form.Field name="email">
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label
                    className="gap-0 font-semibold text-sm"
                    htmlFor={field.name}
                  >
                    <span>Email</span>
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    className="h-13 rounded-none border-border bg-background text-base placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-0"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Enter your email"
                    type="email"
                    value={field.state.value}
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            </form.Field>

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  className="h-13 rounded-none text-primary shadow-xs hover:bg-primary/90 disabled:bg-muted"
                  disabled={!canSubmit || isSubmitting}
                  type="submit"
                >
                  <LoadingSwap isLoading={isSubmitting}>
                    {isSubmitting ? "Sending Email..." : "Send reset link"}
                  </LoadingSwap>
                </Button>
              )}
            </form.Subscribe>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col items-start gap-3 px-0 pt-5">
          <Link
            className="text-primary text-sm decoration-primary/30 underline-offset-4 hover:underline"
            href="/login"
          >
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
