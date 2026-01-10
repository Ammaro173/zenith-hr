export const REQUEST_TYPES = [
  {
    value: "NEW_POSITION",
    label: "New Position",
    description: "Create a completely new role",
  },
  {
    value: "REPLACEMENT",
    label: "Replacement",
    description: "Replace an existing employee",
  },
] as const;

export const CONTRACT_DURATIONS = [
  { value: "FULL_TIME", label: "Unlimited / Permanent" },
  { value: "TEMPORARY", label: "Temporary" },
  { value: "CONSULTANT", label: "Consultant" },
] as const;

export const DEPARTMENTS = [
  "Finance & Accounting",
  "Human Resources",
  "Information Technology",
  "Operations",
  "Sales & Marketing",
  "Legal",
  "Executive Office",
];

export const DEFAULT_DEPARTMENT = "Finance & Accounting";

export const DEFAULT_FORM_VALUES = {
  requestType: "NEW_POSITION",
  isBudgeted: true,
  replacementForUserId: undefined,
  contractDuration: "FULL_TIME",
  justificationText: "",
  salaryRangeMin: 0,
  salaryRangeMax: 0,
  positionDetails: {
    title: "",
    department: DEFAULT_DEPARTMENT,
    description: "",
    location: "Doha, Qatar",
  },
  budgetDetails: {
    currency: "QAR",
    notes: "",
  },
} as const;
