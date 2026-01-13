import type { FilterFieldConfig } from "@/components/ui/filters";

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_MANAGER", label: "Pending Manager" },
  { value: "PENDING_HR", label: "Pending HR" },
  { value: "PENDING_FINANCE", label: "Pending Finance" },
  { value: "PENDING_CEO", label: "Pending CEO" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

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
