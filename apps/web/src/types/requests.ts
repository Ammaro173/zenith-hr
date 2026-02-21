import type { GetMyRequestsInput } from "@zenith-hr/api/modules/requests/requests.schema";

export interface ManpowerRequest {
  id: string;
  requestCode: string;
  requestType: "NEW_POSITION" | "REPLACEMENT";
  status: string;
  currentApproverId: string | null;
  currentApproverRole: string | null;
  createdAt: string | Date;
  positionDetails: {
    title: string;
    department: string;
    description?: string;
    location?: string;
    startDate?: string;
    reportingTo?: string;
  };
  budgetDetails: unknown;
  requester?: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  replacementForUser?: {
    id: string;
    name: string;
  } | null;
  currentApprover?: {
    id: string;
    name: string;
  } | null;
  jobDescription?: {
    title: string;
    description: string;
    responsibilities: string | null;
    departmentName: string | null;
    grade: string | null;
    assignedRole: string;
  } | null;
  reportingPosition?: {
    id: string;
    name: string;
    code: string;
    incumbentName: string | null;
  } | null;
  headcount?: number;
  salaryRangeMin?: string | number;
  salaryRangeMax?: string | number;
  contractDuration?: string;
  employmentType?: string;
  justificationText?: string;
}

export type RequestStatus = GetMyRequestsInput["status"] extends
  | (infer T)[]
  | undefined
  ? T
  : never;
export type RequestType = GetMyRequestsInput["requestType"] extends
  | (infer T)[]
  | undefined
  ? T
  : never;

export const STATUS_VARIANTS: Record<
  string,
  {
    variant:
      | "success"
      | "warning"
      | "destructive"
      | "info"
      | "primary"
      | "secondary";
    label: string;
  }
> = {
  DRAFT: { variant: "secondary", label: "Draft" },
  PENDING_HR: { variant: "warning", label: "Pending HR" },
  PENDING_FINANCE: { variant: "warning", label: "Pending Finance" },
  PENDING_CEO: { variant: "warning", label: "Pending CEO" },
  APPROVED_OPEN: { variant: "success", label: "Approved" },
  REJECTED: { variant: "destructive", label: "Rejected" },
  HIRING_IN_PROGRESS: { variant: "info", label: "Hiring" },
  COMPLETED: { variant: "success", label: "Completed" },
  ARCHIVED: { variant: "secondary", label: "Archived" },
};

export const STATUS_OPTIONS = Object.entries(STATUS_VARIANTS).map(
  ([key, value]) => ({
    label: value.label,
    value: key,
  }),
);

export const TYPE_OPTIONS = [
  { label: "New Position", value: "NEW_POSITION" },
  { label: "Replacement", value: "REPLACEMENT" },
];
