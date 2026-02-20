"use client";

import { useQuery } from "@tanstack/react-query";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { For } from "@/utils/For";
import { If } from "@/utils/If";
import { client } from "@/utils/orpc";

interface DepartmentSelectProps {
  value?: string | null;
  onChange: (val: string | null) => void;
  placeholder?: string;
  nullable?: boolean;
  disabled?: boolean;
  valueKey?: "id" | "name";
  loadingLabel?: string | null;
}

export function DepartmentSelect({
  value,
  onChange,
  placeholder = "Select department...",
  nullable = false,
  disabled = false,
  valueKey = "name",
  loadingLabel,
}: DepartmentSelectProps) {
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => client.users.getDepartments(),
    staleTime: 5 * 60 * 1000,
  });

  const selectValue = nullable ? (value ?? "__none__") : value || undefined;

  return (
    <Select
      disabled={disabled}
      onValueChange={(val) =>
        onChange(nullable && val === "__none__" ? null : val)
      }
      value={selectValue}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <If isTrue={nullable}>
          <SelectItem value="__none__">
            <span className="text-muted-foreground">None</span>
          </SelectItem>
        </If>
        {/* Invisible fallback item so Radix can display the label before options load */}
        {loadingLabel &&
          value &&
          !departments?.find((d) => d[valueKey] === value) && (
            <SelectItem className="hidden" value={value}>
              {loadingLabel}
            </SelectItem>
          )}
        <For
          each={departments}
          render={(dept) => (
            <SelectItem key={dept.id} value={dept[valueKey]}>
              {dept.name}
            </SelectItem>
          )}
        />
      </SelectContent>
    </Select>
  );
}
