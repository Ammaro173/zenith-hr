"use client";

import { useCurrentAdminContext } from "@/context/current-admin-context";
// import { tsr } from "@/lib/react-qeury-utils/tsr";

export function useCurrentAdmin() {
  // const { data: session, status } = useSession();
  // const adminId = session?.user?.id ?? null;
  const context = useCurrentAdminContext();
  const initialAdmin = context?.initialAdmin ?? null;

  // const queryKey = useMemo(
  //   () => ["admin", "current", adminId ?? "unknown"] as const,
  //   [adminId]
  // );

  // const query = tsr.admin.findOne.useQuery({
  //   queryKey,
  //   enabled: Boolean(adminId),
  //   queryData: { params: { id: adminId ?? "" } },
  // });

  const admin = initialAdmin;
  const role = admin?.role ?? null;
  // const isSessionLoading = status === "loading";
  // const isQueryLoading = Boolean(adminId) && query.isPending && !query.data;
  // const isLoading = isSessionLoading || !initialAdmin;
  const isLoading = false;

  return {
    admin,
    role,
    isLoading,
  };
}
