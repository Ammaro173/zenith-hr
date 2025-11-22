export type UserRole = "REQUESTER" | "MANAGER" | "HR" | "FINANCE" | "CEO";

export type RequestStatus =
  | "DRAFT"
  | "PENDING_MANAGER"
  | "PENDING_HR"
  | "PENDING_FINANCE"
  | "PENDING_CEO"
  | "APPROVED_OPEN"
  | "HIRING_IN_PROGRESS"
  | "REJECTED"
  | "ARCHIVED";

export type ApprovalAction =
  | "SUBMIT"
  | "APPROVE"
  | "REJECT"
  | "REQUEST_CHANGE"
  | "HOLD";

export type ContractStatus =
  | "DRAFT"
  | "SENT_FOR_SIGNATURE"
  | "SIGNED"
  | "VOIDED";
