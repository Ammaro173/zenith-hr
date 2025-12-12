"use client";

import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getRoleFromSessionUser } from "@/config/navigation";
import { authClient } from "@/lib/auth-client";
import { Show } from "@/utils/Show";
import { Skeleton } from "./ui/skeleton";

export function AppHeader() {
  const { data: session, isPending } = authClient.useSession();
  const { user } = session ?? {};
  const { name, email } = user ?? {};
  const role = getRoleFromSessionUser(user);
  const userInitials =
    name
      ?.split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-20 border-border/60 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/75">
      <div className="flex h-20 items-center gap-4 px-6">
        {/* <div className="invisible absolute start-4 top-3 z-20 lg:visible"> */}
        <SidebarTrigger className="cursor-pointer rounded-full border border-border/50 bg-background/80 p-2 shadow-sm transition-all duration-200 hover:bg-background hover:shadow-md" />
        {/* </div> */}

        <div className="ml-auto flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="group relative flex cursor-pointer items-center gap-3 rounded-full border border-border/60 bg-background/80 px-3 py-2 shadow-sm transition-all duration-300 hover:border-border hover:bg-background hover:shadow-lg focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isPending}
                type="button"
                variant="ghost"
              >
                <Show>
                  <Show.When isTrue={isPending}>
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-6 rounded-full" />
                      <div className="hidden gap-1 sm:flex sm:flex-col">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-2.5 w-32" />
                      </div>
                      <Skeleton className="size-4" />
                    </div>
                  </Show.When>
                  <Show.Else>
                    <div className="relative">
                      <Avatar className="size-6 border border-border/50 transition-all duration-300 group-hover:border-border group-hover:shadow-md group-hover:ring-2 group-hover:ring-primary/20">
                        <AvatarFallback className="bg-linear-to-br from-primary via-primary to-primary/70 font-semibold text-primary text-xs transition-all duration-300 group-hover:from-primary/90 group-hover:to-primary/80 group-hover:shadow-sm">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="-bottom-0.5 -right-0.5 absolute size-3 animate-pulse rounded-full border-2 border-white bg-green-500" />
                    </div>
                    <div className="hidden gap-0.5 text-left sm:flex sm:flex-col">
                      <span className="font-medium text-sm leading-none transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground">
                        {name}
                      </span>
                      <span className="text-muted-foreground text-xs transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground/80">
                        {email}
                      </span>
                    </div>
                    <ChevronDown className="size-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-foreground group-data-[state=open]:rotate-180" />
                  </Show.Else>
                </Show>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="fade-in-0 zoom-in-95 slide-in-from-top-2 w-60 animate-in border-border/60 bg-background/95 shadow-lg backdrop-blur-sm"
            >
              <DropdownMenuLabel className="flex flex-col gap-1 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-8 border border-border/50">
                    <AvatarFallback className="bg-linear-to-br from-primary to-primary/80 font-semibold text-primary text-sm">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-sm">{name}</span>
                    <span className="text-muted-foreground text-xs">
                      {email}
                    </span>
                    {role ? (
                      <span className="text-muted-foreground text-xs">
                        Role: {role}
                      </span>
                    ) : null}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/60" />
              <DropdownMenuItem className="cursor-pointer px-4 py-2.5 transition-all duration-200 hover:translate-x-1 hover:bg-accent/80">
                <User className="mr-3 size-4 transition-all duration-200 group-hover:text-primary" />
                <span className="font-medium">Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer px-4 py-2.5 transition-all duration-200 hover:translate-x-1 hover:bg-accent/80">
                <Settings className="mr-3 size-4 transition-all duration-200 group-hover:scale-110 group-hover:text-primary" />
                <span className="font-medium">Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/60" />
              <DropdownMenuItem
                className="cursor-pointer px-4 py-2.5 text-destructive transition-all duration-200 hover:translate-x-1 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  authClient.signOut();
                }}
              >
                <LogOut className="mr-3 size-4 transition-all duration-200 group-hover:scale-110 group-hover:text-destructive" />
                <span className="font-medium">Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
