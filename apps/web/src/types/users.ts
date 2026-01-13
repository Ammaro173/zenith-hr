// User types for the User Directory
export type UserRole =
  | "REQUESTER"
  | "MANAGER"
  | "HR"
  | "FINANCE"
  | "CEO"
  | "IT"
  | "ADMIN";

export type UserStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE";

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  sapNo: string;
  role: UserRole;
  status: UserStatus;
  departmentId: string | null;
  departmentName: string | null;
  reportsToManagerId: string | null;
  managerName: string | null;
  createdAt: string | Date;
}

// Hierarchical node structure for org chart
export interface HierarchyNode {
  id: string;
  name: string;
  email: string;
  sapNo: string;
  role: UserRole;
  status: UserStatus;
  departmentName: string | null;
  children: HierarchyNode[];
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
  HR: { variant: "info", label: "HR" },
  FINANCE: { variant: "warning", label: "Finance" },
  IT: { variant: "secondary", label: "IT" },
  MANAGER: { variant: "success", label: "Manager" },
  REQUESTER: { variant: "secondary", label: "Employee" },
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
