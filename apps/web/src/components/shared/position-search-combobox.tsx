"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
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

interface PositionOption {
  id: string;
  code: string;
  name: string;
  departmentName: string | null;
  jobTitle: string | null;
}

interface PositionSearchComboboxProps {
  value?: string | null;
  onChange: (val?: string) => void;
  placeholder?: string;
  nullable?: boolean;
  disabled?: boolean;
}

export function PositionSearchCombobox({
  value,
  onChange,
  placeholder = "Search position...",
  nullable = false,
  disabled = false,
}: PositionSearchComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [selectedCache, setSelectedCache] =
    React.useState<PositionOption | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: positions, isLoading } = useQuery({
    queryKey: ["positions", "search", debouncedSearch],
    queryFn: () =>
      client.positions.search({ query: debouncedSearch, limit: 50 }),
    enabled: open,
  });

  const selected = React.useMemo(() => {
    if (!value) {
      return null;
    }

    const fromResults = positions?.find((item) => item.id === value);
    if (fromResults) {
      return fromResults;
    }

    if (selectedCache?.id === value) {
      return selectedCache;
    }

    return null;
  }, [value, positions, selectedCache]);

  const handleSelect = (item: PositionOption) => {
    setSelectedCache(item);
    onChange(item.id);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedCache(null);
    onChange(undefined);
    setSearch("");
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className={cn(
            "h-9 w-full justify-between px-3 font-normal",
            !selected && "text-muted-foreground",
          )}
          disabled={disabled}
          role="combobox"
          variant="outline"
        >
          <span className="truncate">
            {selected ? `${selected.name} (${selected.code})` : placeholder}
          </span>
          <div className="flex shrink-0 items-center gap-1 pl-2">
            {nullable && value && (
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
              placeholder="Search by position/job/department..."
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
            {!isLoading && (!positions || positions.length === 0) && (
              <div className="py-6 text-center text-muted-foreground text-sm">
                No positions found.
              </div>
            )}
            {!isLoading && positions && positions.length > 0 && (
              <CommandGroup className="p-1">
                {positions.map((item) => {
                  const isSelected = value === item.id;
                  return (
                    <CommandItem
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2",
                        isSelected && "bg-accent",
                      )}
                      key={item.id}
                      onSelect={() => handleSelect(item)}
                      value={item.id}
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
                          {item.name} ({item.code})
                        </span>
                        <span className="line-clamp-1 text-muted-foreground text-xs">
                          {item.jobTitle ?? "No job linked"}
                          {item.departmentName
                            ? ` • ${item.departmentName}`
                            : ""}
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
