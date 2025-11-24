import {
  CircleUser,
  FileText,
  Goal,
  LayoutDashboard,
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
    description: "Monitor activity and key metrics",
  },
  {
    title: "Members",
    href: "/members",
    icon: CircleUser,
    description: "Manage your team roster",
  },
  {
    title: "Applications",
    href: "/applications",
    icon: FileText,
    description: "Manage your team roster",
  },
  {
    title: "Leads Management",
    href: "/leads-management",
    icon: Goal,
    description: "Manage leads",
  },
  {
    title: "Admin Management",
    href: "/admin-management",
    icon: Users,
    description: "Invite users and assign roles",
  },
] as const;

export type ProtectedNavigationItem = (typeof protectedNavigationItems)[number];
