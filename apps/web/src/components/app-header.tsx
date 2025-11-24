import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { headers } from "next/headers";
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
import { authClient } from "@/lib/auth-client";
import { Show } from "@/utils/Show";
import { Skeleton } from "./ui/skeleton";

export async function AppHeader() {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });
  // const { data: session, status } = useSession();
  const userName = session?.user?.name;
  const userEmail = session?.user?.email;
  const userInitials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-20 border-border/60 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/75">
      <div className="flex h-20 items-center gap-4 px-6">
        <SidebarTrigger className="cursor-pointer rounded-full border border-border/50 bg-white/80 p-2 shadow-sm transition-all duration-200 hover:bg-white hover:shadow-md" />

        <div className="ml-auto flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="group relative flex cursor-pointer items-center gap-3 rounded-full border border-border/60 bg-white/80 px-3 py-2 shadow-sm transition-all duration-300 hover:border-border hover:bg-white hover:shadow-lg focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                // disabled={status === "loading"}
                type="button"
                variant="ghost"
              >
                <Show>
                  {/* <Show.When isTrue={status === "loading"}> */}
                  <Show.When isTrue={true}>
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
                        <AvatarFallback className="bg-linear-to-br from-primary via-primary to-primary/70 font-semibold text-white text-xs transition-all duration-300 group-hover:from-primary/90 group-hover:to-primary/80 group-hover:shadow-sm">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="-bottom-0.5 -right-0.5 absolute size-3 animate-pulse rounded-full border-2 border-white bg-green-500" />
                    </div>
                    <div className="hidden gap-0.5 text-left sm:flex sm:flex-col">
                      <span className="font-medium text-sm leading-none transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground">
                        {userName}
                      </span>
                      <span className="text-muted-foreground text-xs transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground/80">
                        {userEmail}
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
                    <AvatarFallback className="bg-linear-to-br from-primary to-primary/80 font-semibold text-sm text-white">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-sm">{userName}</span>
                    <span className="text-muted-foreground text-xs">
                      {userEmail}
                    </span>
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
                onClick={async () => {
                  authClient.signOut({
                    fetchOptions: {
                      headers: await headers(),
                      throw: true,
                    },
                  });
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
