// User types for the User Directory
export type UserRole =
  | "EMPLOYEE"
  | "MANAGER"
  | "HOD"
  | "HOD_HR"
  | "HOD_FINANCE"
  | "HOD_IT"
  | "CEO"
  | "ADMIN";

export type UserStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE";

export interface UserListItem {
  createdAt: string | Date;
  departmentId: string | null;
  departmentName: string | null;
  email: string;
  id: string;
  managerName: string | null;
  name: string;
  positionCode: string | null;
  positionId: string | null;
  positionName: string | null;
  reportsToPositionId: string | null;
  role: UserRole;
  sapNo: string;
  status: UserStatus;
}

// Hierarchical node structure for org chart
export interface HierarchyNode {
  children: HierarchyNode[];
  departmentName: string | null;
  email: string;
  id: string;
  /** True when this node represents an unoccupied position slot (no real user). */
  isVacancy?: boolean;
  name: string;
  /** The name of the job position this node occupies (or the vacant position name). */
  positionName?: string | null;
  role: UserRole;
  sapNo: string;
  status: UserStatus;
}

// Role display configuration
export const ROLE_VARIANTS: Record<
  UserRole,
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
  CEO: { variant: "primary", label: "CEO" },
  ADMIN: { variant: "destructive", label: "Admin" },
  HOD_HR: { variant: "info", label: "HOD - HR" },
  HOD_FINANCE: { variant: "warning", label: "HOD - Finance" },
  HOD_IT: { variant: "secondary", label: "HOD - IT" },
  HOD: { variant: "success", label: "Head of Department" },
  MANAGER: { variant: "success", label: "Manager" },
  EMPLOYEE: { variant: "secondary", label: "Employee" },
};

// Status display configuration
export const STATUS_VARIANTS: Record<
  UserStatus,
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
  ACTIVE: { variant: "success", label: "Active" },
  INACTIVE: { variant: "secondary", label: "Inactive" },
  ON_LEAVE: { variant: "warning", label: "On Leave" },
};

// Options for filter dropdowns
export const ROLE_OPTIONS = Object.entries(ROLE_VARIANTS).map(
  ([key, value]) => ({
    label: value.label,
    value: key,
  }),
);

export const USER_STATUS_OPTIONS = Object.entries(STATUS_VARIANTS).map(
  ([key, value]) => ({
    label: value.label,
    value: key,
  }),
);
