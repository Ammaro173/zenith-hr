import { redirect } from "next/navigation";
import type React from "react";
import LoginBackground from "@/components/shared/login-background";
import { authClient } from "@/lib/auth-client";
import isEmpty from "@/utils/is-empty";

export default async function LoginLayout({
  children,
}: React.PropsWithChildren) {
  const session = await authClient.getSession();

  if (!(isEmpty(session) || session?.error)) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen">
      <LoginBackground />
      {children}
    </div>
  );
}
