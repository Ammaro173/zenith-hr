import type {
  BudgetDetails,
  PositionDetails,
} from "@zenith-hr/domain/requests";

export type CreateRequestInput = {
  requesterId: string;
  positionDetails: PositionDetails;
  budgetDetails: BudgetDetails;
};

export type CreateRequestOutput = {
  id: string;
  requestCode: string;
  status: string;
};

export type UpdateRequestInput = {
  id: string;
  requesterId: string;
  version: number;
  data: {
    positionDetails?: PositionDetails;
    budgetDetails?: BudgetDetails;
  };
};

export type UpdateRequestOutput = {
  id: string;
  version: number;
  status: string;
};
