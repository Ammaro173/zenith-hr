"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2, Plus, Search, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
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

interface JobDescriptionOption {
  id: string;
  title: string;
  description: string;
  responsibilities: string | null;
}

interface JobDescriptionComboboxProps {
  value?: string | null;
  onChange: (
    id?: string,
    details?: { description: string; responsibilities: string | null },
  ) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function JobDescriptionCombobox({
  value,
  onChange,
  placeholder = "Search job descriptions...",
  disabled = false,
}: JobDescriptionComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [selectedCache, setSelectedCache] =
    React.useState<JobDescriptionOption | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["jobDescriptions", "search", debouncedSearch],
    queryFn: () =>
      client.jobDescriptions.search({ search: debouncedSearch, pageSize: 10 }),
    enabled: open,
  });

  const jobDescriptions = data?.data;

  // Find selected job description - first check cache, then check current results
  const selectedItem = React.useMemo(() => {
    if (!value) {
      return null;
    }
    // First try to find in current results
    const fromResults = jobDescriptions?.find((jd) => jd.id === value);
    if (fromResults) {
      return fromResults;
    }
    // Fall back to cache if the item was previously selected
    if (selectedCache?.id === value) {
      return selectedCache;
    }
    return null;
  }, [value, jobDescriptions, selectedCache]);

  const handleSelect = (item: JobDescriptionOption) => {
    // Cache the selected item so we can display its name even when not in results
    setSelectedCache(item);
    // Pass both the id and the details for auto-population
    onChange(item.id, {
      description: item.description,
      responsibilities: item.responsibilities,
    });
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedCache(null);
    onChange(undefined, undefined);
    setSearch("");
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className={cn(
            "h-9 w-full justify-between px-3 font-normal",
            !selectedItem && "text-muted-foreground",
          )}
          disabled={disabled}
          role="combobox"
          variant="outline"
        >
          <span className="truncate">
            {selectedItem ? selectedItem.title : placeholder}
          </span>
          <div className="flex shrink-0 items-center gap-1 pl-2">
            {value && (
              <span
                className="rounded-sm p-0.5 opacity-50 hover:bg-muted hover:opacity-100"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleClear(e as unknown as React.MouseEvent);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <X className="size-3.5" />
              </span>
            )}
            <ChevronDown className="size-4 opacity-50" />
          </div>
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
              placeholder="Search by title or description..."
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
            {!isLoading &&
              (!jobDescriptions || jobDescriptions.length === 0) && (
                <div className="py-6 text-center text-muted-foreground text-sm">
                  No job descriptions found.
                </div>
              )}
            {!isLoading && jobDescriptions && jobDescriptions.length > 0 && (
              <CommandGroup className="p-1">
                {jobDescriptions.map((jd) => {
                  const isSelected = value === jd.id;
                  return (
                    <CommandItem
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2",
                        isSelected && "bg-accent",
                      )}
                      key={jd.id}
                      onSelect={() => handleSelect(jd)}
                      value={jd.id}
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
                          {jd.title}
                        </span>
                        <span className="line-clamp-1 text-muted-foreground text-xs">
                          {jd.description}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </div>
          <div className="border-t p-1">
            <Button
              asChild
              className="w-full justify-start gap-2"
              size="sm"
              variant="ghost"
            >
              <Link href={"/job-descriptions/new" as Route}>
                <Plus className="size-4" />
                Create New Job Description
              </Link>
            </Button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
