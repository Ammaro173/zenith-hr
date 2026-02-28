export type UserRole =
  | "EMPLOYEE"
  | "MANAGER"
  | "HOD"
  | "HOD_HR"
  | "HOD_FINANCE"
  | "HOD_IT"
  | "CEO"
  | "ADMIN";

export type PositionRole =
  | "EMPLOYEE"
  | "MANAGER"
  | "HOD"
  | "HOD_HR"
  | "HOD_FINANCE"
  | "HOD_IT"
  | "CEO";

export type TripStatus =
  | "DRAFT"
  | "PENDING_MANAGER"
  | "PENDING_HOD"
  | "PENDING_HR"
  | "PENDING_FINANCE"
  | "PENDING_CEO"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED"
  | "CANCELLED";

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
