import type { GetMyRequestsInput } from "@zenith-hr/api/modules/requests/requests.schema";

export type ManpowerRequest = {
  id: string;
  requestCode: string;
  requestType: "NEW_POSITION" | "REPLACEMENT";
  status: string;
  currentApproverId: string | null;
  currentApproverRole: string | null;
  createdAt: string | Date;
  positionDetails: {
    title?: string;
    department?: string;
    description?: string;
    location?: string;
  };
  budgetDetails: unknown;
};

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
  PENDING_MANAGER: { variant: "warning", label: "Pending Manager" },
  PENDING_HR: { variant: "warning", label: "Pending HR" },
  PENDING_FINANCE: { variant: "warning", label: "Pending Finance" },
  PENDING_CEO: { variant: "warning", label: "Pending CEO" },
  APPROVED_OPEN: { variant: "success", label: "Approved" },
  REJECTED: { variant: "destructive", label: "Rejected" },
  HIRING_IN_PROGRESS: { variant: "info", label: "Hiring" },
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
