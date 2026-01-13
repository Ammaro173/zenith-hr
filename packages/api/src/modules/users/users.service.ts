import type { db as _db } from "@zenith-hr/db";
import { user } from "@zenith-hr/db/schema/auth";
import { department } from "@zenith-hr/db/schema/departments";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import type { ListUsersInput } from "./users.schema";

// Roles that can see all users
const FULL_ACCESS_ROLES = ["ADMIN", "HR", "CEO", "IT", "FINANCE"];

export interface CurrentUser {
  id: string;
  role: string;
}

export const createUsersService = (db: typeof _db) => ({
  /**
   * Search users by name, email, or SAP number (for autocomplete)
   */
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
          ilike(user.sapNo, `%${query}%`),
        ),
      )
      .limit(limit);
  },

  /**
   * List users with pagination, filtering, and role-based access
   */
  async list(params: ListUsersInput, currentUser: CurrentUser) {
    const {
      page,
      pageSize,
      search,
      role,
      status,
      departmentId,
      sortBy,
      sortOrder,
    } = params;

    // biome-ignore lint/suspicious/noExplicitAny: drizzle condition types are complex
    const conditions: any[] = [];

    // Role-based access control
    if (currentUser.role === "MANAGER") {
      // Managers can only see their direct reports and downstream hierarchy
      const subordinateIds = await this.getSubordinateIds(currentUser.id);
      if (subordinateIds.length === 0) {
        // No subordinates, return empty result
        return {
          data: [],
          total: 0,
          page,
          pageSize,
          pageCount: 0,
        };
      }
      conditions.push(inArray(user.id, subordinateIds));
    } else if (!FULL_ACCESS_ROLES.includes(currentUser.role)) {
      // REQUESTER or unknown role - no access
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        pageCount: 0,
      };
    }
    // ADMIN, HR, CEO, IT, FINANCE can see all users (no additional condition)

    // Role filter
    if (role?.length) {
      conditions.push(inArray(user.role, role));
    }

    // Status filter
    if (status?.length) {
      conditions.push(inArray(user.status, status));
    }

    // Department filter
    if (departmentId?.length) {
      conditions.push(inArray(user.departmentId, departmentId));
    }

    // Search filter (name, email, SAP number)
    if (search) {
      conditions.push(
        or(
          ilike(user.name, `%${search}%`),
          ilike(user.email, `%${search}%`),
          ilike(user.sapNo, `%${search}%`),
        ),
      );
    }

    const offset = (page - 1) * pageSize;

    // Determine sort column
    const orderFn = sortOrder === "desc" ? desc : asc;
    const sortColumn = user[sortBy as keyof typeof user._.columns];
    const orderBy = orderFn(sortColumn);

    // Alias for manager join
    const manager = db
      .select({
        id: user.id,
        name: user.name,
      })
      .from(user)
      .as("manager");

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          sapNo: user.sapNo,
          role: user.role,
          status: user.status,
          departmentId: user.departmentId,
          departmentName: department.name,
          reportsToManagerId: user.reportsToManagerId,
          managerName: manager.name,
          createdAt: user.createdAt,
        })
        .from(user)
        .leftJoin(department, eq(user.departmentId, department.id))
        .leftJoin(manager, eq(user.reportsToManagerId, manager.id))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      db.select({ count: count() }).from(user).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      data,
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
    };
  },

  /**
   * Get all subordinate user IDs recursively (direct reports + their reports, etc.)
   */
  async getSubordinateIds(managerId: string): Promise<string[]> {
    // Use recursive CTE to find all subordinates
    const result = await db.execute(sql`
      WITH RECURSIVE subordinates AS (
        -- Base case: direct reports
        SELECT id FROM "user" WHERE reports_to_manager_id = ${managerId}
        UNION ALL
        -- Recursive case: reports of reports
        SELECT u.id 
        FROM "user" u
        INNER JOIN subordinates s ON u.reports_to_manager_id = s.id
      )
      SELECT id FROM subordinates
    `);

    // Extract IDs from result
    return (result.rows as Array<{ id: string }>).map((row) => row.id);
  },

  /**
   * Get all departments for filter dropdown
   */
  async getDepartments() {
    return await db
      .select({
        id: department.id,
        name: department.name,
      })
      .from(department)
      .orderBy(asc(department.name));
  },
});

export type UsersService = ReturnType<typeof createUsersService>;
