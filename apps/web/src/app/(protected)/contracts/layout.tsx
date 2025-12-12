import { requireRoles } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function ContractsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles(["HR", "ADMIN"]);
  return children;
}
