export type UserRole =
  | "EMPLOYEE"
  | "MANAGER"
  | "HR"
  | "FINANCE"
  | "CEO"
  | "IT"
  | "ADMIN";

export type RequestStatus =
  | "DRAFT"
  | "PENDING_MANAGER"
  | "PENDING_HR"
  | "PENDING_FINANCE"
  | "PENDING_CEO"
  | "APPROVED_OPEN"
  | "HIRING_IN_PROGRESS"
  | "REJECTED"
  | "ARCHIVED"
  | "APPROVED"
  | "COMPLETED"
  | "CANCELLED";

export type ApprovalAction =
  | "SUBMIT"
  | "APPROVE"
  | "REJECT"
  | "REQUEST_CHANGE"
  | "HOLD"
  | "ARCHIVE"
  | "CANCEL";

export type ContractStatus =
  | "DRAFT"
  | "SENT_FOR_SIGNATURE"
  | "SIGNED"
  | "VOIDED";
