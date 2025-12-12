"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { orpc } from "@/utils";

export default function PerformanceCyclePage() {
  const params = useParams<{ id: string }>();

  const { data: cycle, isLoading } = useQuery(
    orpc.performance.getCycle.queryOptions({ input: { id: params.id } })
  );

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!cycle) {
    return <div className="p-6">Not found</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">{cycle.name}</h1>
        <p className="text-muted-foreground">
          {format(new Date(cycle.startDate), "MMM d, yyyy")} -{" "}
          {format(new Date(cycle.endDate), "MMM d, yyyy")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Cycle</span>
            <Badge variant="outline">{cycle.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Start</span>
            <span>{format(new Date(cycle.startDate), "PP")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">End</span>
            <span>{format(new Date(cycle.endDate), "PP")}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
