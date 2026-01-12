"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Faceted,
  FacetedContent,
  FacetedTrigger,
} from "@/components/ui/faceted";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { client } from "@/utils/orpc";

type UserOption = {
  id: string;
  name: string;
  sapNo: string;
  departmentName: string | null;
};

type UserSearchComboboxProps = {
  value?: string;
  onChange: (val?: string) => void;
  placeholder?: string;
};

export function UserSearchCombobox({
  value,
  onChange,
  placeholder = "Search for an employee...",
}: UserSearchComboboxProps) {
  const [search, setSearch] = React.useState("");
  const [selectedUser, setSelectedUser] = React.useState<UserOption | null>(
    null,
  );
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users", "search", debouncedSearch],
    queryFn: () => client.users.search({ query: debouncedSearch }),
    enabled: debouncedSearch.length > 2,
  });

  // When value changes, if we have it in our results, update selectedUser
  React.useEffect(() => {
    if (value && users) {
      const user = users.find((u) => u.id === value);
      if (user) {
        setSelectedUser(user);
      }
    } else if (!value) {
      setSelectedUser(null);
    }
  }, [value, users]);

  return (
    <Faceted onValueChange={(val) => onChange(val as string)} value={value}>
      <FacetedTrigger asChild>
        <Button
          className="w-full justify-between font-normal"
          role="combobox"
          variant="outline"
        >
          {selectedUser ? (
            <span className="truncate">{selectedUser.name}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </FacetedTrigger>
      <FacetedContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0"
      >
        <CommandInput
          onValueChange={setSearch}
          placeholder="Search by name, SAP no, or email..."
          value={search}
        />
        <CommandList>
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading &&
            debouncedSearch.length > 0 &&
            debouncedSearch.length < 3 && (
              <CommandEmpty>Type at least 3 characters...</CommandEmpty>
            )}
          {!isLoading && debouncedSearch.length >= 3 && users?.length === 0 && (
            <CommandEmpty>No employee found.</CommandEmpty>
          )}
          {!isLoading && users && users.length > 0 && (
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  onSelect={() => {
                    setSelectedUser(user);
                    onChange(user.id);
                  }}
                  value={user.id}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === user.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col text-left">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {user.sapNo} • {user.departmentName ?? "No Department"}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </FacetedContent>
    </Faceted>
  );
}
