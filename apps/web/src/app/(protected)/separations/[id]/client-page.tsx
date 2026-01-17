"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { orpc } from "@/utils/orpc";

type ChecklistStatus = "PENDING" | "CLEARED" | "REJECTED";

interface SeparationDetailClientPageProps {
  role: string | null;
}

export function SeparationDetailClientPage({
  role,
}: SeparationDetailClientPageProps) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  const { data: separation, isLoading } = useQuery(
    orpc.separations.get.queryOptions({
      input: { separationId: params.id },
    }),
  );

  const startClearance = useMutation(
    orpc.separations.startClearance.mutationOptions({
      onSuccess: () => {
        toast.success("Clearance started");
        queryClient.invalidateQueries();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateChecklist = useMutation(
    orpc.separations.updateChecklist.mutationOptions({
      onSuccess: () => {
        toast.success("Checklist updated");
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

  const grouped = (separation.checklistItems ?? []).reduce(
    (acc: Record<string, typeof separation.checklistItems>, item) => {
      acc[item.department] = acc[item.department] || [];
      acc[item.department].push(item);
      return acc;
    },
    {},
  );

  const canStart =
    role === "HR" && separation.status !== "CLEARANCE_IN_PROGRESS";

  const canActionDepartment = (dept: string) => {
    if (role === "HR") {
      return true;
    }
    return role?.toUpperCase() === dept;
  };

  const handleUpdate = (id: string, status: ChecklistStatus) => {
    updateChecklist.mutate({
      checklistId: id,
      status,
      remarks: remarks[id],
    });
  };

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

      {canStart ? (
        <Button
          onClick={() => startClearance.mutate({ separationId: separation.id })}
        >
          Start Clearance
        </Button>
      ) : null}

      <Tabs defaultValue="IT">
        <TabsList>
          {Object.keys(grouped).map((dept) => (
            <TabsTrigger key={dept} value={dept}>
              {dept}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(grouped).map(([dept, items]) => (
          <TabsContent key={dept} value={dept}>
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{item.item}</span>
                      <Badge variant="outline">{item.status}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor={`${item.id}-remarks`}>Remarks</Label>
                      <Input
                        id={`${item.id}-remarks`}
                        onChange={(e) =>
                          setRemarks((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        placeholder="Add remark"
                        value={remarks[item.id] ?? ""}
                      />
                    </div>
                    {canActionDepartment(dept) ? (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleUpdate(item.id, "CLEARED")}
                          variant="default"
                        >
                          Clear
                        </Button>
                        <Button
                          onClick={() => handleUpdate(item.id, "REJECTED")}
                          variant="destructive"
                        >
                          Reject
                        </Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
