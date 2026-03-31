"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { client } from "@/utils/orpc";

export interface SeparationSubjectOption {
  departmentName: string | null;
  id: string;
  name: string;
  sapNo: string;
}

interface SeparationSubjectComboboxProps {
  disabled?: boolean;
  onChange: (userId: string | undefined) => void;
  placeholder?: string;
  value?: string | undefined;
}

export function SeparationSubjectCombobox({
  value,
  onChange,
  placeholder = "Search employees you can submit for…",
  disabled = false,
}: SeparationSubjectComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [cache, setCache] = React.useState<SeparationSubjectOption | null>(
    null,
  );
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["separations", "eligibleSubjects", debouncedSearch],
    queryFn: () =>
      client.separations.listEligibleSubjects({
        query: debouncedSearch,
        limit: 50,
      }),
    enabled: open,
  });

  const selected = React.useMemo(() => {
    if (!value) {
      return null;
    }
    const hit = users.find((u) => u.id === value);
    if (hit) {
      return hit;
    }
    if (cache?.id === value) {
      return cache;
    }
    return null;
  }, [value, users, cache]);

  const handleSelect = (option: SeparationSubjectOption) => {
    setCache(option);
    onChange(option.id);
    setOpen(false);
    setSearch("");
  };

  const triggerLabel = selected?.name ?? placeholder;
  const shouldUseMuted = !selected;

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className={cn(
            "h-9 w-full justify-between px-3 font-normal",
            shouldUseMuted && "text-muted-foreground",
          )}
          disabled={disabled}
          role="combobox"
          type="button"
          variant="outline"
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 size-4 shrink-0 opacity-50" />
            <input
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, or SAP…"
              value={search}
            />
          </div>
          <div
            className="max-h-50 overflow-y-auto overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isLoading && users.length === 0 && (
              <div className="py-6 text-center text-muted-foreground text-sm">
                No eligible employees found.
              </div>
            )}
            {!isLoading && users.length > 0 && (
              <CommandGroup className="p-1">
                {users.map((row) => {
                  const isSelected = value === row.id;
                  return (
                    <CommandItem
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2",
                        isSelected && "bg-accent",
                      )}
                      key={row.id}
                      onSelect={() => handleSelect(row)}
                      value={row.id}
                    >
                      <div
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30",
                        )}
                      >
                        {isSelected && <Check className="size-3" />}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium text-sm">
                          {row.name}
                        </span>
                        <span className="truncate text-muted-foreground text-xs">
                          {row.sapNo} • {row.departmentName ?? "No department"}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
