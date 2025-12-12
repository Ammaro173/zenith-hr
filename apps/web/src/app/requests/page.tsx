"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { orpc } from "@/utils/orpc";

export default function RequestsPage() {
  const { data: requests, isLoading } = useQuery(
    orpc.requests.getMyRequests.queryOptions()
  );

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-bold text-2xl">My Requests</h1>
        <Link
          className="rounded bg-blue-500 px-4 py-2 text-primary hover:bg-blue-600"
          href="/requests/new"
        >
          New Request
        </Link>
      </div>
      <div className="space-y-4">
        {requests?.map((request) => (
          <div className="rounded border p-4" key={request.id}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{request.requestCode}</h3>
                <p className="text-muted-foreground text-sm">
                  {(request.positionDetails as { title: string }).title} •{" "}
                  {request.requestType?.toLowerCase()?.replace("_", " ")}
                </p>
                <p className="text-muted-foreground text-xs">
                  {request.isBudgeted ? "Budgeted" : "Unbudgeted"}
                </p>
              </div>
              <span
                className={`rounded px-2 py-1 text-xs ${
                  request.status === "APPROVED_OPEN"
                    ? "bg-green-100 text-green-800"
                    : // biome-ignore lint/style/noNestedTernary: TODO
                      request.status === "REJECTED"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {request.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
