"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_OPTIONS } from "@/types/users";
import { For } from "@/utils/For";

interface RoleSelectProps {
  value?: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function RoleSelect({
  value,
  onChange,
  placeholder = "Select role",
  disabled = false,
}: RoleSelectProps) {
  // TODO: Replace ROLE_OPTIONS with a fetch-based source like departments.
  return (
    <Select disabled={disabled} onValueChange={onChange} value={value}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <For
          each={ROLE_OPTIONS}
          render={(option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          )}
        />
      </SelectContent>
    </Select>
  );
}
