"use client";

import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";

const resetPasswordFormSchema = z
  .object({
    newPassword: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      ),
    confirmPassword: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      ),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const form = useForm({
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
    validators: {
      onSubmit: resetPasswordFormSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      await authClient.resetPassword(
        {
          newPassword: value.newPassword,
          token,
        },
        {
          onSuccess: () => {
            toast.success("Password updated", {
              description: "You can now sign in with your new password.",
            });
            formApi.reset();
            router.push("/login");
          },
          onError: (error: unknown) => {
            // Handle specific error cases
            if (error instanceof Error && error.message) {
              const errorMessage = error.message.toLowerCase();
              if (
                errorMessage.includes("token") ||
                errorMessage.includes("expired") ||
                errorMessage.includes("invalid")
              ) {
                toast.error("Reset link expired", {
                  description:
                    "This reset link has expired or is invalid. Please request a new one.",
                });
                return;
              }
            }
            toast.error("Password reset failed", {
              description:
                error instanceof Error
                  ? error.message
                  : "An unknown error occurred",
            });
          },
        }
      );
    },
  });

  if (!token) {
    return (
      <div className="relative grid min-h-screen place-items-center">
        <Card className="w-full max-w-lg gap-0 rounded-none border border-white/25 bg-background p-12 text-start">
          <CardHeader className="gap-3 px-0 text-start">
            <CardTitle className="font-semibold text-4xl">
              Reset link invalid
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              The reset link is missing or malformed. Request a fresh one to
              continue.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col items-start gap-3 px-0 pt-5">
            <Link
              className="text-primary text-sm decoration-primary/30 underline-offset-4 hover:underline"
              href="/forgot-password"
            >
              Request new reset link
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative grid min-h-screen place-items-center">
      <Card className="w-full max-w-lg gap-0 rounded-none border border-white/25 bg-background p-12 text-start">
        <CardHeader className="gap-3 px-0 text-start">
          <CardTitle className="font-semibold text-4xl">
            Reset Password
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            Choose a strong password to secure your account.
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
            <form.Field name="newPassword">
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label
                    className="gap-0 font-semibold text-sm"
                    htmlFor={field.name}
                  >
                    <span>New password</span>
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    className="h-13 rounded-none border-border bg-background text-base placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-0"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Enter new password"
                    type="password"
                    value={field.state.value}
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            </form.Field>

            <form.Field name="confirmPassword">
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label
                    className="gap-0 font-semibold text-sm"
                    htmlFor={field.name}
                  >
                    <span>Confirm password</span>
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    className="h-13 rounded-none border-border bg-background text-base placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-0"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Confirm new password"
                    type="password"
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
                    {isSubmitting ? "Updating..." : "Reset password"}
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
