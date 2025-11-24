"use client";

import { useForm } from "@tanstack/react-form";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
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
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import { getErrorMessage } from "@/lib/handle-error";
import { tryCatch } from "@/utils";

const mockLogin = async () => ({
  user: {
    id: "1",
    email: "test@test.com",
  },
});

export default function LoginPage() {
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    // validators: {
    //   onChange: loginBodySchema,
    // },
    onSubmit: async ({ value }) => {
      const { isSuccess, data, error } = await tryCatch(
        mockLogin()
        // login({
        //   body: {
        //     email: value.email,
        //     password: value.password,
        //   },
        // })
      );
      if (!isSuccess) {
        toast.error("Login failed", {
          // description: getErrorMessage(error as unknown as ErrorResponseSchema),
          description: getErrorMessage(error),
        });
        return;
      }

      // const { user, accessToken, refreshToken, expiresAt } = data.body;
      await authClient.signIn.email({
        email: value.email,
        password: value.password,
      });
    },
  });

  return (
    <div className="relative grid min-h-screen place-items-center">
      <Card className="w-full max-w-lg gap-0 rounded-none border border-white/25 bg-background p-12 text-start">
        <CardHeader className="items-center gap-17 px-0 text-center">
          <div className="flex flex-col items-center gap-5 text-[#1e1e1e]">
            <Image
              alt="Q-Auto emblem"
              className="object-contain"
              height={32}
              src="/images/logo.svg"
              width={108}
            />
            <span className="font-medium text-[#5f5f5f] text-sm">
              Growing Stronger, Progressing Together
            </span>
          </div>

          <div className="flex flex-col gap-3 text-start">
            <CardTitle className="font-semibold text-4xl">Sign In</CardTitle>
            <CardDescription className="text-[#999999] text-sm">
              Enter your email and password to sign in!
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-0 pt-8">
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
                  <Label
                    className="gap-0 font-semibold text-sm"
                    htmlFor={field.name}
                  >
                    <span>Email</span>
                    <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    className="h-13 rounded-none border-[#e0e0e0] bg-white text-[#1d1d1d] text-base placeholder:text-[#b0b0b0] focus-visible:border-[#2a2a2a] focus-visible:ring-0"
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
                  <Label
                    className="gap-0 font-semibold text-sm"
                    htmlFor={field.name}
                  >
                    <span>Password</span>
                    <span className="text-red-600">*</span>
                  </Label>
                  <div className="relative">
                    <PasswordInput
                      className="h-13 rounded-none border-[#e0e0e0] bg-white pr-12 text-[#1d1d1d] text-base placeholder:text-[#b0b0b0] focus-visible:border-[#2a2a2a] focus-visible:ring-0"
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
                  className={`h-13 rounded-none text-white shadow-xs ${canSubmit ? "hover:bg-primary/90" : "bg-[#E5E5E5]"}`}
                  disabled={!canSubmit}
                  type="submit"
                >
                  <LoadingSwap isLoading={isSubmitting}>
                    {isSubmitting ? "Signing In..." : "Sign In"}
                  </LoadingSwap>
                </Button>
              )}
            </form.Subscribe>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col items-start gap-6 px-0 pt-5">
          <Link
            className="text-primary text-sm decoration-primary/30 underline-offset-4 hover:underline"
            href="/forgot-password"
          >
            Forgot password?
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
