import type { FilterFieldConfig } from "@/components/ui/filters";
import { ROLE_OPTIONS, USER_STATUS_OPTIONS } from "@/types/users";

export const filterFields: FilterFieldConfig[] = [
  {
    key: "role",
    label: "Role",
    type: "select",
    placeholder: "Filter by role...",
    options: ROLE_OPTIONS,
    searchable: true,
    className: "w-[160px]",
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    placeholder: "Filter by status...",
    options: USER_STATUS_OPTIONS,
    searchable: false,
    className: "w-[160px]",
  },
];
