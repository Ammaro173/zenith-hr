import {
  Building2,
  ClipboardList,
  FileText,
  Goal,
  LayoutDashboard,
  LogOut,
  Network,
  Plane,
  Settings,
  Users,
  UsersRound,
} from "lucide-react";
import type { Route } from "next";

export type UserRole =
  | "EMPLOYEE"
  | "MANAGER"
  | "HOD"
  | "HOD_HR"
  | "HOD_FINANCE"
  | "HOD_IT"
  | "CEO"
  | "ADMIN";

export const protectedNavigationItems: {
  title: string;
  href: Route;
  icon: React.ElementType;
  description: string;
  allowedRoles?: UserRole[];
}[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview",
  },
  {
    title: "Manpower Requests",
    href: "/requests",
    icon: FileText,
    description: "Create, update, and track requests",
    allowedRoles: ["MANAGER", "HOD", "HOD_HR", "HOD_FINANCE", "CEO", "ADMIN"],
  },
  {
    title: "Approvals",
    href: "/approvals",
    icon: Users,
    description: "Inbox for pending approvals",
    allowedRoles: ["MANAGER", "HOD", "HOD_HR", "HOD_FINANCE", "CEO", "ADMIN"],
  },
  {
    title: "User Directory",
    href: "/users",
    icon: UsersRound,
    description: "View organization users",
    allowedRoles: ["ADMIN", "HOD_HR", "CEO", "HOD_FINANCE", "HOD", "MANAGER"],
  },
  {
    title: "Departments",
    href: "/departments",
    icon: Building2,
    description: "Manage organization departments",
    allowedRoles: ["ADMIN", "HOD_HR"],
  },
  {
    title: "Positions",
    href: "/positions",
    icon: ClipboardList,
    description:
      "Manage positions, hierarchy levels, and department assignments",
    allowedRoles: ["ADMIN", "HOD_HR", "HOD", "MANAGER", "CEO"],
  },
  {
    title: "Organization Chart",
    href: "/org-chart",
    icon: Network,
    description: "Visualize team hierarchy",
  },
  {
    title: "Business Trips",
    href: "/business-trips",
    icon: Plane,
    description: "Travel requests and expenses",
  },
  {
    title: "Performance",
    href: "/performance",
    icon: Goal,
    description: "Reviews and goals",
  },
  {
    title: "Separations",
    href: "/separations",
    icon: LogOut,
    description: "Exit process management",
  },
  {
    title: "Imports",
    href: "/imports",
    icon: Settings,
    description: "Import users and departments",
    allowedRoles: ["ADMIN", "HOD_HR"],
  },
] as const;

export type ProtectedNavigationItem = (typeof protectedNavigationItems)[number];

export function getRoleFromSessionUser(user: unknown): UserRole | null {
  if (!user || typeof user !== "object") {
    return null;
  }
  if (!("role" in user)) {
    return null;
  }
  const role = (user as { role?: unknown }).role;
  if (
    role === "EMPLOYEE" ||
    role === "MANAGER" ||
    role === "HOD" ||
    role === "HOD_HR" ||
    role === "HOD_FINANCE" ||
    role === "HOD_IT" ||
    role === "CEO" ||
    role === "ADMIN"
  ) {
    return role;
  }
  return null;
}

export function isNavItemAllowedForRole(
  item: ProtectedNavigationItem,
  role: UserRole | null,
): boolean {
  if (!item.allowedRoles || item.allowedRoles.length === 0) {
    return true;
  }
  if (!role) {
    return false;
  }
  return item.allowedRoles.includes(role);
}

export function getNavigationItemsForRole(
  role: UserRole | null,
): ProtectedNavigationItem[] {
  return protectedNavigationItems.filter((item) =>
    isNavItemAllowedForRole(item, role),
  );
}

/**
 * Returns the default landing route based on user role.
 * Different roles are directed to the most relevant page for their workflow.
 */
export function getDefaultRouteForRole(role: UserRole | null): string {
  if (role === "ADMIN") {
    return "/dashboard";
  }
  if (
    role === "CEO" ||
    role === "HOD_FINANCE" ||
    role === "HOD_HR" ||
    role === "HOD_IT" ||
    role === "HOD" ||
    role === "MANAGER"
  ) {
    return "/dashboard";
  }
  // EMPLOYEE and unknown roles go to dashboard
  return "/dashboard";
}
