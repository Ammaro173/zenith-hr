"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

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
}

export function DepartmentSelect({
  value,
  onChange,
  placeholder = "Select department...",
  nullable = false,
  disabled = false,
  valueKey = "name",
}: DepartmentSelectProps) {
  const { data: departments, isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: () => client.users.getDepartments(),
  });

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <Loader2 className="mr-2 size-4 animate-spin" />
          <span className="text-muted-foreground">Loading...</span>
        </SelectTrigger>
      </Select>
    );
  }

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
