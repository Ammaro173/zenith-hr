"use client";

import LoginBackground from "@/components/shared/login-background";
import { cn } from "@/lib/utils";
import { Image } from "@/utils/Image";
import { Show } from "@/utils/Show";

type OnboardingShellProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "member" | "staff";
};

export function OnboardingShell({
  children,
  className,
  variant = "member",
}: OnboardingShellProps) {
  const isStaff = variant === "staff";

  return (
    <div className={cn("relative h-svh w-full overflow-auto", className)}>
      <Show>
        <Show.When isTrue={isStaff}>
          <div className="pointer-events-none fixed inset-0">
            <LoginBackground className="h-full w-full" />
          </div>
        </Show.When>
        <Show.Else>
          <div className="pointer-events-none fixed inset-0">
            <div className="absolute inset-0 md:hidden">
              <Image
                alt="Audi background"
                className="h-full w-full object-cover"
                fallback="/images/small-Audi-bg.png"
                src="/images/portrait-audi-bg.png"
              />
            </div>
            <div className="absolute inset-0 hidden md:block">
              <Image
                alt="Audi background"
                className="h-full w-full object-cover"
                fallback="/images/portrait-audi-bg.png"
                src="/images/small-Audi-bg.png"
              />
            </div>
          </div>
        </Show.Else>
      </Show>

      {/* Dark overlay for text contrast */}
      <div className="pointer-events-none fixed inset-0 bg-primary/55" />

      <div className="relative mx-auto flex h-full w-full max-w-md flex-col px-4 py-6 sm:max-w-lg sm:px-8 md:max-w-2xl lg:max-w-4xl lg:px-12">
        {children}
      </div>
    </div>
  );
}
