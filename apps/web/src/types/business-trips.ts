import type { GetMyTripsInput } from "@zenith-hr/api/modules/business-trips/business-trips.schema";

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
  status: string;
  travelClass: string | null;
  updatedAt: string | Date;
  version: number;
  visaRequired: boolean;
}

export type TripStatus = GetMyTripsInput["status"] extends
  | (infer T)[]
  | undefined
  ? T
  : never;

export const STATUS_VARIANTS: Record<
  string,
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
  APPROVED: { variant: "success", label: "Approved" },
  REJECTED: { variant: "destructive", label: "Rejected" },
  COMPLETED: { variant: "secondary", label: "Completed" },
  CANCELLED: { variant: "secondary", label: "Cancelled" },
};

export const STATUS_OPTIONS = Object.entries(STATUS_VARIANTS).map(
  ([key, value]) => ({
    label: value.label,
    value: key,
  }),
);

/** Human-readable labels for approval history step names (raw status → display) */
export const TRIP_STEP_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_MANAGER: "Manager Review",
  PENDING_HOD: "HOD Review",
  PENDING_HR: "HR Review",
  PENDING_FINANCE: "Finance Review",
  PENDING_CEO: "CEO Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};
