"use client";

import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import FieldInfo from "@/components/shared/field-info";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { PasswordInput } from "@/components/ui/password-input";
import {
  getDefaultRouteForRole,
  getRoleFromSessionUser,
} from "@/config/navigation";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const INPUT_STYLES =
  "h-13 rounded-none border-[#e0e0e0] bg-background text-[#1d1d1d] text-base placeholder:text-[#b0b0b0] focus-visible:border-[#2a2a2a] focus-visible:ring-0";

export function LoginForm() {
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onChange: loginSchema,
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email.toLowerCase(), // Normalize email to lowercase
          password: value.password,
        },
        {
          onSuccess: (ctx) => {
            toast.success("Sign in successful");
            const role = getRoleFromSessionUser(ctx.data?.user);
            const redirectPath = getDefaultRouteForRole(role);
            window.location.replace(redirectPath);
          },
          onError: (ctx) => {
            toast.error("Login failed", {
              description: ctx.error.message || "Invalid credentials",
            });
          },
        },
      );
    },
  });

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <form.Field name="email">
        {(field) => (
          <div className="flex flex-col gap-2">
            <Label className="gap-0 font-semibold text-sm" htmlFor={field.name}>
              <span>Email</span>
              <span className="text-red-600">*</span>
            </Label>
            <Input
              className={INPUT_STYLES}
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Enter your email"
              type="email"
              value={field.state.value}
            />
            <FieldInfo field={field} />
          </div>
        )}
      </form.Field>

      <form.Field name="password">
        {(field) => (
          <div className="flex flex-col gap-2">
            <Label className="gap-0 font-semibold text-sm" htmlFor={field.name}>
              <span>Password</span>
              <span className="text-red-600">*</span>
            </Label>
            <div className="relative">
              <PasswordInput
                className={cn(INPUT_STYLES, "pr-12")}
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Enter Password"
                value={field.state.value}
              />
              <FieldInfo field={field} />
            </div>
          </div>
        )}
      </form.Field>

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
      >
        {([canSubmit, isSubmitting]) => (
          <Button
            className={cn(
              "h-13 rounded-none text-primary shadow-xs",
              canSubmit ? "hover:bg-primary/90" : "bg-muted",
            )}
            disabled={!canSubmit}
            type="submit"
          >
            <LoadingSwap
              className={cn(canSubmit ? "text-secondary" : "text-primary")}
              isLoading={isSubmitting}
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
            </LoadingSwap>
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
