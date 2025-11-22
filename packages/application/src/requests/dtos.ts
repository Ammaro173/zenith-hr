import type {
  BudgetDetails,
  PositionDetails,
} from "@zenith-hr/domain/requests";

export interface CreateRequestInput {
  requesterId: string;
  positionDetails: PositionDetails;
  budgetDetails: BudgetDetails;
}

export interface CreateRequestOutput {
  id: string;
  requestCode: string;
  status: string;
}

export interface UpdateRequestInput {
  id: string;
  requesterId: string;
  version: number;
  data: {
    positionDetails?: PositionDetails;
    budgetDetails?: BudgetDetails;
  };
}

export interface UpdateRequestOutput {
  id: string;
  version: number;
  status: string;
}
