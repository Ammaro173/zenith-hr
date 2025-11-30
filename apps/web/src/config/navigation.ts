import {
  Calendar,
  DollarSign,
  FileText,
  Goal,
  LayoutDashboard,
  LogOut,
  Plane,
  Settings,
  Users,
} from "lucide-react";
import type { Route } from "next";

export const protectedNavigationItems: {
  title: string;
  href: Route;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview",
  },
  {
    title: "Directory",
    href: "/directory",
    icon: Users,
    description: "Employee directory",
  },
  {
    title: "Recruitment",
    href: "/recruitment",
    icon: Users,
    description: "Job postings and pipeline",
  },
  {
    title: "Onboarding",
    href: "/onboarding",
    icon: FileText,
    description: "New hire checklists",
  },
  {
    title: "Performance",
    href: "/performance",
    icon: Goal,
    description: "Reviews and goals",
  },
  {
    title: "Time Off",
    href: "/time-off",
    icon: Calendar,
    description: "Leave requests and balances",
  },
  {
    title: "Business Trips",
    href: "/business-trips",
    icon: Plane,
    description: "Travel requests and expenses",
  },
  {
    title: "Payroll",
    href: "/payroll",
    icon: DollarSign,
    description: "Compensation and benefits",
  },
  {
    title: "Separations",
    href: "/separations",
    icon: LogOut,
    description: "Exit process management",
  },
  {
    title: "Admin",
    href: "/admin-management",
    icon: Settings,
    description: "System configuration",
  },
] as const;

export type ProtectedNavigationItem = (typeof protectedNavigationItems)[number];
