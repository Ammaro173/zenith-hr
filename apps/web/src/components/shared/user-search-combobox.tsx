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

interface UserOption {
  id: string;
  name: string;
  sapNo: string;
  departmentName: string | null;
  primarySlotCode?: string | null;
}

interface UserSearchComboboxProps {
  value?: string | null;
  onChange: (val?: string) => void;
  onOptionChange?: (option: UserOption | null) => void;
  placeholder?: string;
  fallbackLabel?: string | null;
  valueKey?: "id" | "primarySlotCode";
  excludeUserId?: string;
  nullable?: boolean;
  disabled?: boolean;
}

export function UserSearchCombobox({
  value,
  onChange,
  onOptionChange,
  placeholder = "Search for an employee...",
  fallbackLabel,
  valueKey = "id",
  excludeUserId,
  nullable = false,
  disabled = false,
}: UserSearchComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [selectedUserCache, setSelectedUserCache] =
    React.useState<UserOption | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users", "search", debouncedSearch],
    queryFn: () => client.users.search({ query: debouncedSearch }),
    enabled: open,
  });

  // Filter out excluded user if provided
  const filteredUsers = React.useMemo(() => {
    if (!users) {
      return [];
    }
    if (!excludeUserId) {
      return users;
    }
    return users.filter((u) => u.id !== excludeUserId);
  }, [users, excludeUserId]);

  const getOptionValue = React.useCallback(
    (option: UserOption): string | null => {
      if (valueKey === "primarySlotCode") {
        return option.primarySlotCode ?? null;
      }
      return option.id;
    },
    [valueKey],
  );

  // Find selected user - first check cache, then check current results
  const selectedUser = React.useMemo(() => {
    if (!value) {
      return null;
    }
    // First try to find in current results
    const fromResults = filteredUsers.find((u) => getOptionValue(u) === value);
    if (fromResults) {
      return fromResults;
    }
    // Fall back to cache if the user was previously selected
    if (selectedUserCache && getOptionValue(selectedUserCache) === value) {
      return selectedUserCache;
    }
    return null;
  }, [value, filteredUsers, selectedUserCache, getOptionValue]);

  const handleSelect = (user: UserOption) => {
    // Cache the selected user so we can display their name even when they're not in results
    setSelectedUserCache(user);
    const selectedValue = getOptionValue(user);
    onChange(selectedValue ?? undefined);
    onOptionChange?.(user);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedUserCache(null);
    onChange(undefined);
    onOptionChange?.(null);
    setSearch("");
  };

  const hasFallbackSelection = Boolean(value && fallbackLabel);
  let triggerLabel = placeholder;
  if (selectedUser) {
    triggerLabel = selectedUser.name;
  } else if (hasFallbackSelection) {
    triggerLabel = fallbackLabel ?? placeholder;
  }

  const shouldUseMutedStyle = !(selectedUser || hasFallbackSelection);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className={cn(
            "h-9 w-full justify-between px-3 font-normal",
            shouldUseMutedStyle && "text-muted-foreground",
          )}
          disabled={disabled}
          role="combobox"
          variant="outline"
        >
          <span className="truncate">{triggerLabel}</span>
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
              placeholder="Search by name or SAP no..."
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
            {!isLoading && filteredUsers.length === 0 && (
              <div className="py-6 text-center text-muted-foreground text-sm">
                No employees found.
              </div>
            )}
            {!isLoading && filteredUsers.length > 0 && (
              <CommandGroup className="p-1">
                {filteredUsers.map((user) => {
                  const isSelected = value === getOptionValue(user);
                  return (
                    <CommandItem
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2",
                        isSelected && "bg-accent",
                      )}
                      key={user.id}
                      onSelect={() => handleSelect(user)}
                      value={user.id}
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
                          {user.name}
                        </span>
                        <span className="truncate text-muted-foreground text-xs">
                          {user.sapNo} •{" "}
                          {user.departmentName ?? "No Department"}
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
