"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { orpc } from "@/utils/orpc";

export default function Home() {
  const { data: stats } = useQuery(orpc.dashboard.getStats.queryOptions());

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 font-bold text-2xl">Zenith HR Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border p-4">
          <h3 className="text-gray-600 text-sm">Total Requests</h3>
          <p className="font-bold text-2xl">{stats?.totalRequests || 0}</p>
        </div>
        <div className="rounded border p-4">
          <h3 className="text-gray-600 text-sm">Pending</h3>
          <p className="font-bold text-2xl">{stats?.pendingRequests || 0}</p>
        </div>
        <div className="rounded border p-4">
          <h3 className="text-gray-600 text-sm">Approved</h3>
          <p className="font-bold text-2xl">{stats?.approvedRequests || 0}</p>
        </div>
        <div className="rounded border p-4">
          <h3 className="text-gray-600 text-sm">Signed Contracts</h3>
          <p className="font-bold text-2xl">{stats?.signedContracts || 0}</p>
        </div>
      </div>
      <div className="mt-8">
        <Link
          className="mr-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          href="/requests"
        >
          My Requests
        </Link>
        <Link
          className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          href="/approvals"
        >
          Pending Approvals
        </Link>
      </div>
    </div>
  );
}
