import { requireRoles } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function ImportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles(["ADMIN", "HR"]);
  return children;
}
