import { requireRoles } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles(["HOD_HR", "ADMIN"]);
  return children;
}
