import type { Metadata } from "next";
import { ResetPasswordForm } from "./_components/reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password • Audi Club",
  description:
    "Choose a new password for your Audi Club admin account using your secure reset link.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
