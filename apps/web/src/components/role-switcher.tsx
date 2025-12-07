"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCurrentAdmin } from "@/hooks/use-current-admin";
import { cn } from "@/lib/utils";

const roles = [
  {
    value: "SUPER_ADMIN",
    label: "Super Admin",
  },
  {
    value: "HR",
    label: "HR Admin",
  },
  {
    value: "MANAGER",
    label: "Manager",
  },
  {
    value: "EMPLOYEE",
    label: "Employee",
  },
] as const;

export function RoleSwitcher() {
  const [open, setOpen] = React.useState(false);
  const { role, setRole } = useCurrentAdmin();

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="w-[200px] justify-between"
          role="combobox"
          variant="outline"
        >
          {role ? roles.find((r) => r.value === role)?.label : "Select role..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search role..." />
          <CommandList>
            <CommandEmpty>No role found.</CommandEmpty>
            <CommandGroup>
              {roles.map((r) => (
                <CommandItem
                  key={r.value}
                  onSelect={(currentValue) => {
                    setRole?.(currentValue === role ? null : currentValue);
                    setOpen(false);
                  }}
                  value={r.value}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      role === r.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {r.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
