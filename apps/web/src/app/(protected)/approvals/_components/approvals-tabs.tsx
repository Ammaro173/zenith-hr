"use client";

import { useQueryState } from "nuqs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PendingRequestApprovalsGrid } from "./pending-request-approvals-grid";
import { PendingTripApprovalsGrid } from "./pending-trip-approvals-grid";

export function ApprovalsTabs() {
  const [tab, setTab] = useQueryState("tab", {
    defaultValue: "requests",
    shallow: false,
  });

  const value = tab === "trips" ? "trips" : "requests";

  return (
    <Tabs onValueChange={(next) => setTab(next)} value={value}>
      <div className="flex items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="trips">Trips</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="requests">
        <PendingRequestApprovalsGrid />
      </TabsContent>
      <TabsContent value="trips">
        <PendingTripApprovalsGrid />
      </TabsContent>
    </Tabs>
  );
}
