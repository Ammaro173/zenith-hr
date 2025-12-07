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

export default function BusinessTripsPage() {
  const { data: trips, isLoading } = useQuery(
    orpc.businessTrips.getMyTrips.queryOptions()
  );
  const hasTrips = (trips?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Business Trips</h1>
          <p className="text-muted-foreground">
            Manage your travel requests and expenses.
          </p>
        </div>
        <Button asChild>
          <Link href="/business-trips/new">
            <Plus className="mr-2 h-4 w-4" />
            New Trip
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Trips</CardTitle>
          <CardDescription>
            A list of your recent business trips.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destination</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Est. Cost</TableHead>
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

              {isLoading || hasTrips ? null : (
                <TableRow>
                  <TableCell className="text-center" colSpan={5}>
                    No trips found.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && hasTrips
                ? (trips?.map((trip) => (
                    <TableRow key={trip.id}>
                      <TableCell className="font-medium">
                        <Link
                          className="hover:underline"
                          href={`/business-trips/${trip.id}`}
                        >
                          {trip.destination}
                        </Link>
                      </TableCell>
                      <TableCell>{trip.purpose}</TableCell>
                      <TableCell>
                        {format(new Date(trip.startDate), "MMM d")} -{" "}
                        {format(new Date(trip.endDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{trip.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {trip.estimatedCost
                          ? `${trip.currency} ${trip.estimatedCost}`
                          : "-"}
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
