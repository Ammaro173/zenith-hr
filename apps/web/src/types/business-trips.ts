import type { GetMyTripsInput } from "@zenith-hr/api/modules/business-trips/business-trips.schema";

export interface BusinessTrip {
  id: string;
  requesterId: string;
  delegatedUserId: string | null;
  country: string;
  city: string;
  purposeType: string;
  purposeDetails: string | null;
  startDate: string | Date;
  endDate: string | Date;
  estimatedCost: string | null;
  currency: string | null;
  visaRequired: boolean;
  needsFlightBooking: boolean;
  needsHotelBooking: boolean;
  perDiemAllowance: string | null;
  departureCity: string | null;
  arrivalCity: string | null;
  preferredDepartureDate: string | Date | null;
  preferredArrivalDate: string | Date | null;
  travelClass: string | null;
  flightNotes: string | null;
  status: string;
  currentApproverId: string | null;
  currentApproverRole: string | null;
  revisionVersion: number;
  version: number;
  createdAt: string | Date;
  updatedAt: string | Date;
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
