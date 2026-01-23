"use client";

import { Loader2, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// We need a router endpoint for "my recent requests".
// Since we didn't add one specifically, we might reuse `requests.list` with filters,
// OR simpler: assume we will pass data or fetch it here.
// But `active requests` implies specific filtering.
// I'll create a simple placeholder component that accepts data or assumes empty state for now
// until we hook it up properly with a query. OR I can use `requestsRouter` if accessible.
// Since this is a "Component" it should preferably assume props, but for "My Active Requests"
// it's often a smart component.

// I'll assume we pass it valid data structure or it fetches using a generic 'requests.list' with limits.
// Let's implement it as a layout component that takes props for now to keep it clean.

interface RequestItem {
  requestCode: string;
  createdAt: string;
  positionDetails?: {
    title?: string;
  };
  // biome-ignore lint/suspicious/noExplicitAny: simplified structure
  [key: string]: any;
}

interface ActiveRequestsTableProps {
  requests?: RequestItem[]; // Replace with proper type later
  isLoading?: boolean;
}

export function ActiveRequestsTable({
  requests = [],
  isLoading,
}: ActiveRequestsTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Mock data if empty for visualization/testing (remove in prod)
  const displayRequests = requests.length > 0 ? requests : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">My Active Requests</h2>
        <div className="flex gap-2">{/* Filter placehodler */}</div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-75">Request Details</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Current Workflow Step</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRequests.length === 0 ? (
              <TableRow>
                <TableCell
                  className="h-24 text-center text-muted-foreground"
                  colSpan={5}
                >
                  No active requests found.
                </TableCell>
              </TableRow>
            ) : (
              displayRequests.map((req, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                        <span className="font-bold text-xs">REQ</span>
                      </div>
                      <div>
                        <div className="font-medium">
                          {req.positionDetails?.title || "Position Title"}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {req.requestCode || "REQ-202X-001"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          AS
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs">
                          Waiting for Manager
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Pending Approval
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      className="border-orange-200 bg-orange-50 text-orange-600"
                      variant="outline"
                    >
                      Pending
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button className="h-8 w-8" size="icon" variant="ghost">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
