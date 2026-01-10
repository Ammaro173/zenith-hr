import type { FilterFieldConfig } from "@/components/ui/filters";
import { STATUS_OPTIONS, TYPE_OPTIONS } from "@/types/requests";

export const filterFields: FilterFieldConfig[] = [
  {
    key: "requestType",
    label: "Type",
    type: "select",
    placeholder: "Filter by type...",
    options: TYPE_OPTIONS,
    searchable: true,
    className: "w-[160px]",
  },
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
