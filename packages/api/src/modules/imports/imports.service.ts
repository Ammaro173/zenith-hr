import { randomUUID } from "node:crypto";
import { db as defaultDb } from "@zenith-hr/db";
import { department, user } from "@zenith-hr/db/schema";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { importUsersSchema } from "./imports.schema";

type UserInsert = typeof user.$inferInsert;

export const createImportsService = (db = defaultDb) => ({
  async importUsers(input: z.infer<typeof importUsersSchema>) {
    const results: { email: string; status: "inserted" | "skipped" }[] = [];

    for (const record of input.users) {
      if (!record.email) {
        continue;
      }
      const [existing] = await db
        .select()
        .from(user)
        .where(eq(user.email, record.email))
        .limit(1);

      if (existing) {
        results.push({ email: record.email, status: "skipped" });
        continue;
      }

      const userValues: UserInsert = {
        id: record.id ?? randomUUID(),
        name: record.name,
        email: record.email,
        emailVerified: true,
        role: record.role,
        status: "ACTIVE",
        sapNo: record.sapNo,
        departmentId: record.departmentId ?? null,
        reportsToManagerId: null,
        passwordHash: null,
        signatureUrl: null,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(user).values(userValues);

      results.push({ email: record.email, status: "inserted" });
    }

    return results;
  },

  async importDepartments(records: { name: string; costCenterCode: string }[]) {
    const results: { name: string; status: "inserted" | "skipped" }[] = [];
    for (const record of records) {
      const [existing] = await db
        .select()
        .from(department)
        .where(eq(department.name, record.name))
        .limit(1);

      if (existing) {
        results.push({ name: record.name, status: "skipped" });
        continue;
      }

      await db.insert(department).values({
        name: record.name,
        costCenterCode: record.costCenterCode,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      results.push({ name: record.name, status: "inserted" });
    }
    return results;
  },
});

export type ImportsService = ReturnType<typeof createImportsService>;
