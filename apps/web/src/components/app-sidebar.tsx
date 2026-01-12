"use client";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  getNavigationItemsForRole,
  getRoleFromSessionUser,
  type ProtectedNavigationItem,
} from "@/config/navigation";
import { authClient } from "@/lib/auth-client";
import { For } from "@/utils/For";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: {
    id: string;
    name: string;
    email: string;
    role?: string | null;
  };
};

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const role = getRoleFromSessionUser(user);

  const navigationItems = useMemo<ProtectedNavigationItem[]>(
    () => getNavigationItemsForRole(role),
    [role],
  );

  return (
    <Sidebar {...props}>
      <SidebarHeader className="px-5 pt-8 pb-0">
        <div className="flex items-center gap-3">
          <Image
            alt="Q-Auto emblem"
            className="object-contain"
            height={32}
            src="/images/logo.svg"
            width={108}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-5 py-9">
        <SidebarMenu>
          <For
            each={navigationItems}
            render={(item) => {
              const isActive = pathname.startsWith(item.href);
              const ItemIcon = item.icon;

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    className="group h-10 flex-1 gap-3 rounded-xl px-3 py-2 transition"
                    isActive={isActive}
                  >
                    <Link
                      className="flex w-full items-center gap-3 text-left transition-all"
                      href={item.href as Route}
                    >
                      <ItemIcon
                        className={`size-5! ${
                          isActive ? "text-secondary" : "text-muted-foreground"
                        }`}
                      />
                      <span
                        className={`font-medium text-sm tracking-tight ${
                          isActive ? "text-secondary" : "text-muted-foreground"
                        }`}
                      >
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            }}
          />
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="rounded-xl bg-muted p-4">
          <div className="mb-3 flex flex-col items-center text-center">
            <span className="font-semibold text-muted-foreground text-sm">
              Q-Auto
            </span>
            <span className="text-muted-foreground text-xs">
              Manage your Memberships
            </span>
          </div>
          <Button
            className="w-full rounded-none bg-primary text-center text-primary-foreground transition hover:bg-primary/90"
            onClick={async () => {
              await authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push("/login");
                  },
                },
              });
            }}
            type="button"
          >
            Logout
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
