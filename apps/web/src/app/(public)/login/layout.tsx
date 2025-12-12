import { redirect } from "next/navigation";
import type React from "react";
import LoginBackground from "@/components/shared/login-background";
import { getServerSession } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export default async function LoginLayout({
  children,
}: React.PropsWithChildren) {
  const session = await getServerSession();

  if (!session?.error && session?.data?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen">
      <LoginBackground />
      {children}
    </div>
  );
}
