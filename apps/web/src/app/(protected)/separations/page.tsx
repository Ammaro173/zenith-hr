"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus } from "lucide-react";
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
import { orpc } from "@/utils";

export default function SeparationsPage() {
  const { data: separations, isLoading } = useQuery(
    orpc.separations.getSeparations.queryOptions()
  );

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
          <Link href="/separations/new">
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
              ) : separations?.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center" colSpan={5}>
                    No requests found.
                  </TableCell>
                </TableRow>
              ) : (
                separations?.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.employee.name}
                    </TableCell>
                    <TableCell>{request.type}</TableCell>
                    <TableCell>
                      {format(new Date(request.lastWorkingDay), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{request.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/separations/${request.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
