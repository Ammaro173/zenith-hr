export interface PositionDetails {
  title: string;
  department: string;
  [key: string]: any;
}

export interface BudgetDetails {
  salaryMin: number;
  salaryMax: number;
  currency: string;
  [key: string]: any;
}

export interface ManpowerRequest {
  id: string;
  requesterId: string;
  requestCode: string;
  status:
    | "DRAFT"
    | "PENDING_MANAGER"
    | "PENDING_HR"
    | "PENDING_FINANCE"
    | "PENDING_CEO"
    | "APPROVED_OPEN"
    | "HIRING_IN_PROGRESS"
    | "CLOSED"
    | "REJECTED";
  positionDetails: PositionDetails;
  budgetDetails: BudgetDetails;
  revisionVersion: number;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
}
