"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  type ProtectedNavigationItem,
  protectedNavigationItems,
} from "@/config/navigation";
import { useCurrentAdmin } from "@/hooks/use-current-admin";
import { authClient } from "@/lib/auth-client";
import { For } from "@/utils/For";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { admin, isLoading } = useCurrentAdmin();

  const navigationItems = useMemo<ProtectedNavigationItem[]>(() => {
    const restrictedRoutes = new Set([
      "/leads-management",
      "/admin-management",
    ]);

    if (isLoading) {
      return [];
    }

    if (admin?.role === "HR") {
      return protectedNavigationItems.filter(
        (item) => !restrictedRoutes.has(item.href)
      );
    }

    return protectedNavigationItems;
  }, [admin?.role, isLoading]);

  const skeletonItems = useMemo(
    () => ["primary", "secondary", "tertiary", "quaternary"],
    []
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
          {isLoading ? (
            skeletonItems.map((key) => (
              <SidebarMenuItem key={`sidebar-skeleton-${key}`}>
                <div className="flex h-10 items-center gap-3 rounded-xl px-3 py-2">
                  <Skeleton className="size-5 rounded-full" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </SidebarMenuItem>
            ))
          ) : (
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
                        href={item.href}
                      >
                        <ItemIcon
                          className={`size-5! ${
                            isActive ? "text-white" : "text-[#666666]"
                          }`}
                        />
                        <span
                          className={`font-medium text-sm tracking-tight ${
                            isActive ? "text-white" : "text-[#666666]"
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
          )}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="rounded-xl bg-gray-50 p-4">
          <div className="mb-3 flex flex-col items-center text-center">
            <span className="font-semibold text-gray-800 text-sm">Q-Auto</span>
            <span className="text-gray-500 text-xs">
              Manage your Memberships
            </span>
          </div>
          <Button
            className="w-full rounded-none bg-primary text-center text-white transition hover:bg-primary/90"
            onClick={async () => {
              await authClient.signOut();
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
