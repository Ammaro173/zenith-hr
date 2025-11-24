import type { Metadata } from "next";
import { ForgotPasswordForm } from "./_components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password • Audi Club",
  description:
    "Request a password reset link to regain access to your Audi Club admin account.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
