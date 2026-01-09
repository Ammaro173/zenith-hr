import type { db as _db } from "@zenith-hr/db";
import { user } from "@zenith-hr/db/schema/auth";
import { department } from "@zenith-hr/db/schema/departments";
import { eq, ilike, or } from "drizzle-orm";

export const createUsersService = (db: typeof _db) => ({
  async search(query: string, limit = 10) {
    return await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        sapNo: user.sapNo,
        departmentName: department.name,
      })
      .from(user)
      .leftJoin(department, eq(user.departmentId, department.id))
      .where(
        or(
          ilike(user.name, `%${query}%`),
          ilike(user.email, `%${query}%`),
          ilike(user.sapNo, `%${query}%`)
        )
      )
      .limit(limit);
  },
});

export type UsersService = ReturnType<typeof createUsersService>;
