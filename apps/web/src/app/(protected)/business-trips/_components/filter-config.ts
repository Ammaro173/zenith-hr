import type { FilterFieldConfig } from "@/components/ui/filters";
import { STATUS_OPTIONS } from "@/types/business-trips";

export const filterFields: FilterFieldConfig[] = [
  {
    key: "status",
    label: "Status",
    type: "select",
    placeholder: "Filter by status...",
    options: STATUS_OPTIONS,
    searchable: true,
    className: "w-[180px]",
  },
];
