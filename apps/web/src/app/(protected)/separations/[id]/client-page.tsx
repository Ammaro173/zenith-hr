"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClearanceBoard } from "@/features/separations";
import { orpc } from "@/utils/orpc";

interface SeparationDetailClientPageProps {
  role: string | null;
}

export function SeparationDetailClientPage({
  role,
}: SeparationDetailClientPageProps) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: separation, isLoading } = useQuery(
    orpc.separations.get.queryOptions({
      input: { separationId: params.id },
    }),
  );

  const approveByManager = useMutation(
    orpc.separations.approveByManager.mutationOptions({
      onSuccess: () => {
        toast.success("Approved");
        queryClient.invalidateQueries();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const approveByHr = useMutation(
    orpc.separations.approveByHr.mutationOptions({
      onSuccess: () => {
        toast.success("Clearance started");
        queryClient.invalidateQueries();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!separation) {
    return <div className="p-6">Not found</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Button onClick={() => router.back()} variant="outline">
          Back
        </Button>
        <div>
          <h1 className="font-bold text-2xl">Separation</h1>
          <p className="text-muted-foreground">
            {separation.employee.name} • Last day: {separation.lastWorkingDay}
          </p>
        </div>
        <div className="ml-auto">
          <Badge variant="outline">{separation.status}</Badge>
        </div>
      </div>

      {["REQUESTED", "PENDING_MANAGER", "PENDING_HR"].includes(
        separation.status,
      ) && (
        <Card>
          <CardHeader>
            <CardTitle>Request Status: Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This separation request is currently pending necessary approvals.
              The clearance checklist will be generated and displayed here once
              it has been fully approved by HR.
            </p>
          </CardContent>
        </Card>
      )}

      {separation.status === "PENDING_MANAGER" &&
      role &&
      [
        "MANAGER",
        "HOD",
        "HOD_IT",
        "HOD_FINANCE",
        "CEO",
        "HOD_HR",
        "ADMIN",
      ].includes(role) ? (
        <Card>
          <CardHeader>
            <CardTitle>Manager approval required</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              disabled={approveByManager.isPending}
              onClick={() =>
                approveByManager.mutate({ separationId: separation.id })
              }
            >
              Approve
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {separation.status === "PENDING_HR" &&
      role &&
      ["HOD_HR", "ADMIN"].includes(role) ? (
        <Card>
          <CardHeader>
            <CardTitle>HR approval required</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              disabled={approveByHr.isPending}
              onClick={() =>
                approveByHr.mutate({ separationId: separation.id })
              }
            >
              Approve & Start Clearance
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {["CLEARANCE_IN_PROGRESS", "COMPLETED"].includes(separation.status) ? (
        <ClearanceBoard role={role} separation={separation} />
      ) : null}
    </div>
  );
}
