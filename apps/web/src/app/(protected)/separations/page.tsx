"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getRoleFromSessionUser } from "@/config/navigation";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils";

export default function SeparationsPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const role = getRoleFromSessionUser(session?.user);

  const listReady = !sessionPending && role !== null;

  const { data: separations, isLoading } = useQuery({
    ...orpc.separations.getSeparations.queryOptions(),
    enabled: listReady,
  });
  const hasSeparations = (separations?.length ?? 0) > 0;

  if (!listReady) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const isEmployee = role === "EMPLOYEE";

  if (isEmployee) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Separations</h1>
          <p className="text-muted-foreground">
            Submit resignation or retirement, or open a request you already
            started.
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Request exit</CardTitle>
              <CardDescription>
                Start a new separation request (resignation or retirement).
              </CardDescription>
            </div>
            <Button asChild className="shrink-0">
              <Link href={"/separations/new" as Route}>
                <Plus className="mr-2 h-4 w-4" />
                New request
              </Link>
            </Button>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your separation requests</CardTitle>
            <CardDescription>
              Only requests you submitted or are involved in are shown here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Last Working Day</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell className="text-center" colSpan={4}>
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : null}

                {isLoading || hasSeparations ? null : (
                  <TableRow>
                    <TableCell className="text-center" colSpan={4}>
                      No requests yet. Use the New request button above to start
                      one.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && hasSeparations
                  ? (separations?.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          {request.type}
                        </TableCell>
                        <TableCell>
                          {format(
                            new Date(request.lastWorkingDay),
                            "MMM d, yyyy",
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{request.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/separations/${request.id}` as Route}>
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) ?? null)
                  : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Separations</h1>
          <p className="text-muted-foreground">
            Manage employee exit processes and checklists.
          </p>
        </div>
        <Button asChild>
          <Link href={"/separations/new" as Route}>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Separation Requests</CardTitle>
          <CardDescription>
            List of active and past separation requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Last Working Day</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell className="text-center" colSpan={5}>
                    Loading...
                  </TableCell>
                </TableRow>
              ) : null}

              {isLoading || hasSeparations ? null : (
                <TableRow>
                  <TableCell className="text-center" colSpan={5}>
                    No requests found.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && hasSeparations
                ? (separations?.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.employee.name}
                      </TableCell>
                      <TableCell>{request.type}</TableCell>
                      <TableCell>
                        {format(
                          new Date(request.lastWorkingDay),
                          "MMM d, yyyy",
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{request.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/separations/${request.id}` as Route}>
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) ?? null)
                : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
