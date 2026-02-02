"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { USER_STATUS_OPTIONS } from "@/types/users";
import { For } from "@/utils/For";

interface StatusSelectProps {
  value?: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function StatusSelect({
  value,
  onChange,
  placeholder = "Select status",
  disabled = false,
}: StatusSelectProps) {
  // TODO: Replace USER_STATUS_OPTIONS with a fetch-based source like departments.
  return (
    <Select disabled={disabled} onValueChange={onChange} value={value}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <For
          each={USER_STATUS_OPTIONS}
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
