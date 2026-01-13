"use client";

import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { UserRole } from "@/config/navigation";
import { client } from "@/utils/orpc";

interface ImportResult {
  email: string;
  status: "inserted" | "skipped";
}

const LINE_BREAK_REGEX = /\r?\n/;

function parseUserRole(value: string | undefined): UserRole {
  if (
    value === "REQUESTER" ||
    value === "MANAGER" ||
    value === "HR" ||
    value === "FINANCE" ||
    value === "CEO" ||
    value === "IT" ||
    value === "ADMIN"
  ) {
    return value;
  }
  return "REQUESTER";
}

function parseCsv(text: string): string[][] {
  return text
    .split(LINE_BREAK_REGEX)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(",").map((cell) => cell.trim()));
}

export default function ImportsPage() {
  const [usersCsv, setUsersCsv] = useState("");
  const [departmentsCsv, setDepartmentsCsv] = useState("");

  const usersPreview = useMemo(
    () => parseCsv(usersCsv).slice(0, 5),
    [usersCsv],
  );
  const departmentsPreview = useMemo(
    () => parseCsv(departmentsCsv).slice(0, 5),
    [departmentsCsv],
  );

  const importUsers = useMutation({
    mutationFn: async () => {
      const rows = parseCsv(usersCsv);
      const [header, ...data] = rows;
      if (!header) {
        throw new Error("Users CSV is empty");
      }

      // Expected columns (case-insensitive): name,email,sapNo,role,departmentId,id(optional)
      const idx = (key: string) =>
        header.findIndex((h) => h.toLowerCase() === key.toLowerCase());

      const users = data.map((row) => ({
        id: idx("id") >= 0 ? row[idx("id")] || undefined : undefined,
        name: row[idx("name")] ?? "",
        email: row[idx("email")] ?? "",
        sapNo: row[idx("sapNo")] ?? row[idx("sap_no")] ?? "",
        role: parseUserRole(row[idx("role")]),
        departmentId:
          idx("departmentId") >= 0
            ? row[idx("departmentId")] || undefined
            : undefined,
      }));

      return await client.imports.importUsers({ users });
    },
    onSuccess: (results: ImportResult[]) => {
      const inserted = results.filter((r) => r.status === "inserted").length;
      const skipped = results.filter((r) => r.status === "skipped").length;
      toast.success(
        `Users import done: ${inserted} inserted, ${skipped} skipped`,
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const importDepartments = useMutation({
    mutationFn: async () => {
      const rows = parseCsv(departmentsCsv);
      const [header, ...data] = rows;
      if (!header) {
        throw new Error("Departments CSV is empty");
      }

      // Expected columns (case-insensitive): name,costCenterCode,headOfDepartmentId(optional),id(optional)
      const idx = (key: string) =>
        header.findIndex((h) => h.toLowerCase() === key.toLowerCase());

      const departments = data.map((row) => ({
        id: idx("id") >= 0 ? row[idx("id")] || undefined : undefined,
        name: row[idx("name")] ?? "",
        costCenterCode:
          row[idx("costCenterCode")] ?? row[idx("cost_center_code")] ?? "",
        headOfDepartmentId:
          idx("headOfDepartmentId") >= 0
            ? row[idx("headOfDepartmentId")] || undefined
            : undefined,
      }));

      return await client.imports.importDepartments({ departments });
    },
    onSuccess: () => {
      toast.success("Departments import done");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="container mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div>
        <h1 className="font-bold text-2xl">Imports</h1>
        <p className="text-muted-foreground text-sm">
          Paste CSV content and import. This is the quickest path to bring
          SAP-exported data into the system.
        </p>
      </div>

      <section className="space-y-3 rounded border p-4">
        <h2 className="font-semibold">Import Users</h2>
        <p className="text-muted-foreground text-sm">
          CSV header example: <code>name,email,sapNo,role,departmentId</code>
        </p>
        <textarea
          className="min-h-[180px] w-full rounded border p-2 font-mono text-sm"
          onChange={(e) => setUsersCsv(e.target.value)}
          placeholder="name,email,sapNo,role,departmentId\nAlice,alice@q-auto.com,SAP-1001,REQUESTER,uuid..."
          value={usersCsv}
        />
        {usersPreview.length > 0 ? (
          <pre className="overflow-auto rounded bg-muted p-3 text-xs">
            {JSON.stringify(usersPreview, null, 2)}
          </pre>
        ) : null}
        <button
          className="rounded bg-blue-500 px-4 py-2 text-primary hover:bg-blue-600 disabled:opacity-50"
          disabled={importUsers.isPending}
          onClick={() => importUsers.mutate()}
          type="button"
        >
          {importUsers.isPending ? "Importing..." : "Import Users"}
        </button>
      </section>

      <section className="space-y-3 rounded border p-4">
        <h2 className="font-semibold">Import Departments</h2>
        <p className="text-muted-foreground text-sm">
          CSV header example:{" "}
          <code>name,costCenterCode,headOfDepartmentId</code>
        </p>
        <textarea
          className="min-h-[180px] w-full rounded border p-2 font-mono text-sm"
          onChange={(e) => setDepartmentsCsv(e.target.value)}
          placeholder="name,costCenterCode\nHR,CC-100"
          value={departmentsCsv}
        />
        {departmentsPreview.length > 0 ? (
          <pre className="overflow-auto rounded bg-muted p-3 text-xs">
            {JSON.stringify(departmentsPreview, null, 2)}
          </pre>
        ) : null}
        <button
          className="rounded bg-blue-500 px-4 py-2 text-primary hover:bg-blue-600 disabled:opacity-50"
          disabled={importDepartments.isPending}
          onClick={() => importDepartments.mutate()}
          type="button"
        >
          {importDepartments.isPending ? "Importing..." : "Import Departments"}
        </button>
      </section>
    </div>
  );
}
