import type { GetMyTripsInput } from "@zenith-hr/api/modules/business-trips/business-trips.schema";
import type { TripStatus as ApiTripStatus } from "@zenith-hr/api/shared/types";

export type TripFilterStatus = GetMyTripsInput["status"] extends
  | (infer T)[]
  | undefined
  ? T
  : never;
export type TripStatus = ApiTripStatus;

export interface BusinessTrip {
  arrivalCity: string | null;
  city: string;
  country: string;
  createdAt: string | Date;
  currency: string | null;
  currentApproverPositionId: string | null;
  departureCity: string | null;
  endDate: string | Date;
  estimatedCost: string | null;
  flightNotes: string | null;
  id: string;
  needsFlightBooking: boolean;
  needsHotelBooking: boolean;
  perDiemAllowance: string | null;
  preferredArrivalDate: string | Date | null;
  preferredDepartureDate: string | Date | null;
  purposeDetails: string | null;
  purposeType: string;
  requesterId: string;
  requiredApproverRole: string | null;
  revisionVersion: number;
  startDate: string | Date;
  status: TripStatus;
  travelClass: string | null;
  updatedAt: string | Date;
  version: number;
  visaRequired: boolean;
}

export const STATUS_VARIANTS: Record<
  TripStatus,
  {
    variant:
      | "default"
      | "secondary"
      | "destructive"
      | "outline"
      | "success"
      | "warning"
      | "info";
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
  APPROVED: { variant: "success", label: "Approved" },
  REJECTED: { variant: "destructive", label: "Rejected" },
  COMPLETED: { variant: "secondary", label: "Completed" },
  CANCELLED: { variant: "secondary", label: "Cancelled" },
};

const FILTERABLE_STATUSES: TripFilterStatus[] = [
  "DRAFT",
  "PENDING_MANAGER",
  "PENDING_HOD",
  "PENDING_HR",
  "PENDING_FINANCE",
  "PENDING_CEO",
  "CHANGE_REQUESTED",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
  "CANCELLED",
];

export const STATUS_OPTIONS = FILTERABLE_STATUSES.map((status) => ({
  label: STATUS_VARIANTS[status].label,
  value: status,
}));

/** Human-readable labels for approval history step names (raw status → display) */
export const TRIP_STEP_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_MANAGER: "Manager Review",
  PENDING_HOD: "HOD Review",
  PENDING_HR: "HR Review",
  PENDING_FINANCE: "Finance Review",
  PENDING_CEO: "CEO Review",
  CHANGE_REQUESTED: "Change Requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};
