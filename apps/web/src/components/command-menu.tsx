"use client";

import {
  type Action,
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarProvider,
  KBarResults,
  KBarSearch,
  useMatches,
  useRegisterActions,
} from "kbar";
import { Laptop, Moon, Search, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { type ReactNode, useMemo } from "react";
import { protectedNavigationItems } from "@/config/navigation";

export function CommandMenu({ children }: { children: ReactNode }) {
  return (
    <KBarProvider>
      <CommandMenuInner />
      {children}
    </KBarProvider>
  );
}

function CommandMenuInner() {
  const router = useRouter();
  const { setTheme } = useTheme();

  const actions = useMemo(() => {
    const navigationActions: Action[] = protectedNavigationItems.map(
      (item) => ({
        id: item.href,
        name: item.title,
        keywords: item.description,
        section: "Navigation",
        perform: () => router.push(item.href),
        icon: <item.icon className="h-4 w-4" />,
        subtitle: item.description,
      })
    );

    const themeActions: Action[] = [
      {
        id: "theme",
        name: "Theme",
        section: "Preferences",
        keywords: "dark light system mode",
        icon: <Laptop className="h-4 w-4" />,
      },
      {
        id: "theme-light",
        name: "Light Mode",
        parent: "theme",
        perform: () => setTheme("light"),
        keywords: "light",
        icon: <Sun className="h-4 w-4" />,
      },
      {
        id: "theme-dark",
        name: "Dark Mode",
        parent: "theme",
        perform: () => setTheme("dark"),
        keywords: "dark",
        icon: <Moon className="h-4 w-4" />,
      },
      {
        id: "theme-system",
        name: "System Mode",
        parent: "theme",
        perform: () => setTheme("system"),
        keywords: "system",
        icon: <Laptop className="h-4 w-4" />,
      },
    ];

    return [...navigationActions, ...themeActions];
  }, [router, setTheme]);

  useRegisterActions(actions);

  return (
    <KBarPortal>
      <KBarPositioner className="fixed inset-0 z-50 bg-primary/80 p-4 backdrop-blur-sm">
        <KBarAnimator className="w-full max-w-xl overflow-hidden rounded-xl border bg-background shadow-2xl">
          <div className="flex items-center border-b px-4">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <KBarSearch
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Type a command or search..."
            />
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium font-mono text-[10px] text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
          <RenderResults />
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
  );
}

function RenderResults() {
  const { results } = useMatches();

  if (results.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        No results found.
      </div>
    );
  }

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) =>
        typeof item === "string" ? (
          <div className="px-4 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            {item}
          </div>
        ) : (
          <div
            className={`flex cursor-pointer items-center gap-2 px-4 py-3 text-sm transition-colors ${
              active ? "bg-accent text-accent-foreground" : "text-foreground"
            }`}
          >
            {item.icon && (
              <div className="mr-2 flex h-4 w-4 items-center justify-center">
                {item.icon}
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-medium">{item.name}</span>
              {item.subtitle && (
                <span className="text-muted-foreground text-xs">
                  {item.subtitle}
                </span>
              )}
            </div>
            {item.shortcut?.length ? (
              <div className="ml-auto flex items-center gap-1">
                {item.shortcut.map((sc) => (
                  <kbd
                    className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium font-mono text-[10px] text-muted-foreground opacity-100"
                    key={sc}
                  >
                    {sc}
                  </kbd>
                ))}
              </div>
            ) : null}
          </div>
        )
      }
    />
  );
}
