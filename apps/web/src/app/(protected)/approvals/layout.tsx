import { requireRoles } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function ApprovalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles(["MANAGER", "HOD_HR", "HOD_FINANCE", "CEO", "ADMIN"]);
  return children;
}
