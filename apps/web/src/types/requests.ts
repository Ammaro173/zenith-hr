import type { GetMyRequestsInput } from "@zenith-hr/api/modules/requests/requests.schema";
import type { RequestStatus as ApiRequestStatus } from "@zenith-hr/api/shared/types";

export type RequestFilterStatus = GetMyRequestsInput["status"] extends
  | (infer T)[]
  | undefined
  ? T
  : never;
export type RequestStatus = ApiRequestStatus;

export interface ManpowerRequest {
  budgetDetails: unknown;
  contractDuration?: string;
  createdAt: string | Date;
  currentApprover?: {
    id: string;
    name: string;
  } | null;
  currentApproverPositionId: string | null;
  employmentType?: string;
  headcount?: number;
  id: string;
  justificationText?: string;
  position?: {
    name: string;
    description: string | null;
    responsibilities: string | null;
    departmentName: string | null;
    grade: string | null;
    role: string;
  } | null;
  positionDetails: {
    title: string;
    department: string;
    description?: string;
    location?: string;
    startDate?: string;
    reportingTo?: string;
  };
  replacementForUser?: {
    id: string;
    name: string;
  } | null;
  reportingPosition?: {
    id: string;
    name: string;
    code: string;
    incumbentName: string | null;
  } | null;
  requestCode: string;
  requester?: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  requestType: "NEW_POSITION" | "REPLACEMENT";
  requiredApproverRole: string | null;
  salaryRangeMax?: string | number;
  salaryRangeMin?: string | number;
  status: RequestStatus;
}
export type RequestType = GetMyRequestsInput["requestType"] extends
  | (infer T)[]
  | undefined
  ? T
  : never;

export const STATUS_VARIANTS: Record<
  RequestStatus,
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
  PENDING_MANAGER: { variant: "warning", label: "Pending Manager" },
  PENDING_HOD: { variant: "warning", label: "Pending HOD" },
  PENDING_HR: { variant: "warning", label: "Pending HR" },
  PENDING_FINANCE: { variant: "warning", label: "Pending Finance" },
  PENDING_CEO: { variant: "warning", label: "Pending CEO" },
  CHANGE_REQUESTED: { variant: "warning", label: "Change Requested" },
  APPROVED_OPEN: { variant: "success", label: "Approved" },
  APPROVED: { variant: "success", label: "Approved" },
  REJECTED: { variant: "destructive", label: "Rejected" },
  HIRING_IN_PROGRESS: { variant: "info", label: "Hiring" },
  COMPLETED: { variant: "success", label: "Completed" },
  CANCELLED: { variant: "secondary", label: "Cancelled" },
  ARCHIVED: { variant: "secondary", label: "Archived" },
};

const FILTERABLE_STATUSES: RequestFilterStatus[] = [
  "DRAFT",
  "PENDING_MANAGER",
  "PENDING_HOD",
  "PENDING_HR",
  "PENDING_FINANCE",
  "PENDING_CEO",
  "CHANGE_REQUESTED",
  "APPROVED_OPEN",
  "HIRING_IN_PROGRESS",
  "REJECTED",
  "ARCHIVED",
  "COMPLETED",
];

export const STATUS_OPTIONS = FILTERABLE_STATUSES.map((status) => ({
  label: STATUS_VARIANTS[status].label,
  value: status,
}));

export const TYPE_OPTIONS = [
  { label: "New Position", value: "NEW_POSITION" },
  { label: "Replacement", value: "REPLACEMENT" },
];
