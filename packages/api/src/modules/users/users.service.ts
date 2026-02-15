import { randomUUID } from "node:crypto";
import { hashPassword } from "@zenith-hr/auth";
import type { DbOrTx } from "@zenith-hr/db";
import { account, session, user } from "@zenith-hr/db/schema/auth";
import { department } from "@zenith-hr/db/schema/departments";
import {
  positionSlot,
  slotAssignment,
} from "@zenith-hr/db/schema/position-slots";
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
import { AppError } from "../../shared/errors";
import type {
  CreateUserInput,
  HierarchyNode,
  ListUsersInput,
  UpdateUserInput,
  UserResponse,
  UserSession,
} from "./users.schema";

// Roles that can see all users
const FULL_ACCESS_ROLES = ["ADMIN", "HR", "CEO", "IT", "FINANCE"];

export interface CurrentUser {
  id: string;
  role: string;
}

async function resolveManagerUserIdBySlotCode(
  db: DbOrTx,
  slotCode: string,
): Promise<string> {
  const normalizedCode = slotCode.trim();
  if (!normalizedCode) {
    throw AppError.badRequest("Manager slot code cannot be empty");
  }

  const [slot] = await db
    .select({ id: positionSlot.id })
    .from(positionSlot)
    .where(eq(positionSlot.code, normalizedCode))
    .limit(1);

  if (!slot) {
    throw AppError.badRequest("Manager slot code not found");
  }

  const [activeAssignment] = await db
    .select({ userId: slotAssignment.userId })
    .from(slotAssignment)
    .where(
      and(
        eq(slotAssignment.slotId, slot.id),
        sql`${slotAssignment.endsAt} IS NULL`,
      ),
    )
    .limit(1);

  if (!activeAssignment?.userId) {
    throw AppError.badRequest(
      "No active user assignment found for manager slot code",
    );
  }

  return activeAssignment.userId;
}

async function getManagerInfoByUserIds(
  db: DbOrTx,
  userIds: string[],
): Promise<
  Map<
    string,
    {
      managerUserId: string | null;
      managerName: string | null;
      managerSlotCode: string | null;
    }
  >
> {
  const managerMap = new Map<
    string,
    {
      managerUserId: string | null;
      managerName: string | null;
      managerSlotCode: string | null;
    }
  >();

  if (userIds.length === 0) {
    return managerMap;
  }

  if (typeof (db as { execute?: unknown }).execute !== "function") {
    return managerMap;
  }

  const userIdList = sql.join(
    userIds.map((id) => sql`${id}`),
    sql`, `,
  );

  const managerRows = await db.execute(sql`
    WITH child_assignments AS (
      SELECT sa.user_id, sa.slot_id
      FROM slot_assignment sa
      WHERE sa.ends_at IS NULL
        AND sa.is_primary = TRUE
        AND sa.user_id IN (${userIdList})
    )
    SELECT DISTINCT ON (ca.user_id)
      ca.user_id AS user_id,
      parent_sa.user_id AS manager_user_id,
      manager_user.name AS manager_name,
      parent_slot.code AS manager_slot_code
    FROM child_assignments ca
    LEFT JOIN slot_reporting_line srl ON srl.child_slot_id = ca.slot_id
    LEFT JOIN position_slot parent_slot ON parent_slot.id = srl.parent_slot_id
    LEFT JOIN slot_assignment parent_sa
      ON parent_sa.slot_id = srl.parent_slot_id
      AND parent_sa.ends_at IS NULL
      AND parent_sa.is_primary = TRUE
    LEFT JOIN "user" manager_user ON manager_user.id = parent_sa.user_id
    ORDER BY ca.user_id, parent_sa.created_at DESC NULLS LAST
  `);

  for (const row of managerRows.rows as Array<{
    user_id: string;
    manager_user_id: string | null;
    manager_name: string | null;
    manager_slot_code: string | null;
  }>) {
    managerMap.set(row.user_id, {
      managerUserId: row.manager_user_id,
      managerName: row.manager_name,
      managerSlotCode: row.manager_slot_code,
    });
  }

  return managerMap;
}

async function withSlotManagers<
  T extends {
    id: string;
    managerName?: string | null;
    managerSlotCode?: string | null;
  },
>(
  db: DbOrTx,
  rows: T[],
): Promise<
  Array<
    T & {
      managerName: string | null;
      managerSlotCode: string | null;
    }
  >
> {
  const supportsExecute =
    typeof (db as { execute?: unknown }).execute === "function";
  const managerMap = supportsExecute
    ? await getManagerInfoByUserIds(
        db,
        rows.map((row) => row.id),
      )
    : new Map<
        string,
        {
          managerUserId: string | null;
          managerName: string | null;
          managerSlotCode: string | null;
        }
      >();

  return rows.map((row) => {
    const manager = supportsExecute
      ? managerMap.get(row.id)
      : {
          managerName: row.managerName ?? null,
          managerSlotCode: row.managerSlotCode ?? null,
        };

    return {
      ...row,
      managerName: manager?.managerName ?? null,
      managerSlotCode: manager?.managerSlotCode ?? null,
    };
  });
}

function toUserResponse(
  row: Pick<
    UserResponse,
    | "id"
    | "name"
    | "email"
    | "sapNo"
    | "role"
    | "status"
    | "departmentId"
    | "departmentName"
    | "managerSlotCode"
    | "managerName"
    | "createdAt"
    | "updatedAt"
  >,
): UserResponse {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    sapNo: row.sapNo,
    role: row.role,
    status: row.status,
    departmentId: row.departmentId,
    departmentName: row.departmentName,
    managerSlotCode: row.managerSlotCode,
    managerName: row.managerName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const createUsersService = (db: DbOrTx) => ({
  /**
   * Search users by name, email, or SAP number (for autocomplete)
   * If query is empty, returns all users up to limit
   */
  async search(query: string, limit = 100) {
    const baseQuery = db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        sapNo: user.sapNo,
        departmentName: department.name,
        primarySlotCode: positionSlot.code,
      })
      .from(user)
      .leftJoin(department, eq(user.departmentId, department.id))
      .leftJoin(
        slotAssignment,
        and(
          eq(slotAssignment.userId, user.id),
          sql`${slotAssignment.endsAt} IS NULL`,
          eq(slotAssignment.isPrimary, true),
        ),
      )
      .leftJoin(positionSlot, eq(positionSlot.id, slotAssignment.slotId));

    // If query is empty, return all users (up to limit)
    if (!query.trim()) {
      return await baseQuery.limit(limit);
    }

    // Otherwise filter by query
    return await baseQuery
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
      // EMPLOYEE or unknown role - no access
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

    const manager = db
      .select({
        id: user.id,
        name: user.name,
      })
      .from(user)
      .as("manager");

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalResult] = await Promise.all([
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
          managerSlotCode: sql<string | null>`null`,
          managerName: sql<string | null>`null`,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })
        .from(user)
        .leftJoin(department, eq(user.departmentId, department.id))
        .leftJoin(manager, sql`1 = 0`)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      db.select({ count: count() }).from(user).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;
    const data = (await withSlotManagers(db, rows)).map(toUserResponse);

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
    const [managerSlot] = await db
      .select({ slotId: slotAssignment.slotId })
      .from(slotAssignment)
      .where(
        and(
          eq(slotAssignment.userId, managerId),
          sql`${slotAssignment.endsAt} IS NULL`,
        ),
      )
      .limit(1);

    if (!managerSlot?.slotId) {
      return [];
    }

    const result = await db.execute(sql`
      WITH RECURSIVE subordinate_slots AS (
        SELECT child_slot_id AS slot_id
        FROM slot_reporting_line
        WHERE parent_slot_id = ${managerSlot.slotId}

        UNION ALL

        SELECT srl.child_slot_id AS slot_id
        FROM slot_reporting_line srl
        INNER JOIN subordinate_slots ss ON srl.parent_slot_id = ss.slot_id
      )
      SELECT sa.user_id AS id
      FROM subordinate_slots ss
      INNER JOIN slot_assignment sa ON sa.slot_id = ss.slot_id
      WHERE sa.ends_at IS NULL
    `);

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

  /**
   * Get organizational hierarchy for org chart
   * Returns users in a nested tree structure
   */
  async getHierarchy(
    currentUser: CurrentUser,
    scope: "team" | "organization",
  ): Promise<HierarchyNode[]> {
    // Determine which users to include based on role and scope
    const isFullAccessRole = FULL_ACCESS_ROLES.includes(currentUser.role);

    const hierarchyResult = await db.execute(sql`
      WITH active_assignments AS (
        SELECT sa.user_id, sa.slot_id
        FROM slot_assignment sa
        WHERE sa.ends_at IS NULL
      ),
      parent_map AS (
        SELECT
          aa.user_id AS child_user_id,
          parent_sa.user_id AS manager_user_id
        FROM active_assignments aa
        LEFT JOIN slot_reporting_line srl ON srl.child_slot_id = aa.slot_id
        LEFT JOIN active_assignments parent_sa ON parent_sa.slot_id = srl.parent_slot_id
      )
      SELECT
        u.id,
        u.name,
        u.email,
        u.sap_no,
        u.role,
        u.status,
        d.name AS department_name,
        pm.manager_user_id
      FROM "user" u
      LEFT JOIN department d ON d.id = u.department_id
      LEFT JOIN parent_map pm ON pm.child_user_id = u.id
      WHERE u.status = 'ACTIVE'
    `);

    const allUsers = (
      hierarchyResult.rows as Array<{
        id: string;
        name: string;
        email: string;
        sap_no: string;
        role: string;
        status: string;
        department_name: string | null;
        manager_user_id: string | null;
      }>
    ).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      sapNo: row.sap_no,
      role: row.role,
      status: row.status,
      departmentName: row.department_name,
      managerUserId: row.manager_user_id,
    }));

    // Build a map for quick lookup
    const userMap = new Map<string, (typeof allUsers)[0]>();
    for (const u of allUsers) {
      userMap.set(u.id, u);
    }

    // Build hierarchical structure
    const buildNode = (u: (typeof allUsers)[0]): HierarchyNode => ({
      id: u.id,
      name: u.name,
      email: u.email,
      sapNo: u.sapNo,
      role: u.role,
      status: u.status,
      departmentName: u.departmentName,
      children: [],
    });

    // Find all children for each user
    const childrenMap = new Map<string | null, (typeof allUsers)[0][]>();
    for (const u of allUsers) {
      const managerId = u.managerUserId;
      const existing = childrenMap.get(managerId);
      if (existing) {
        existing.push(u);
      } else {
        childrenMap.set(managerId, [u]);
      }
    }

    // Recursively build tree from a root user
    const buildTree = (userId: string): HierarchyNode | null => {
      const userData = userMap.get(userId);
      if (!userData) {
        return null;
      }

      const node = buildNode(userData);
      const children = childrenMap.get(userId) ?? [];
      node.children = children
        .map((child) => buildTree(child.id))
        .filter((n): n is HierarchyNode => n !== null)
        .sort((a, b) => a.name.localeCompare(b.name));
      return node;
    };

    // Fall back to legacy manager links when no slot hierarchy has been seeded yet
    if (allUsers.length === 0) {
      return [];
    }

    // For organization scope (full access roles only)
    if (scope === "organization" && isFullAccessRole) {
      // Find all root users (no manager)
      const roots = childrenMap.get(null) ?? [];
      return roots
        .map((u) => buildTree(u.id))
        .filter((n): n is HierarchyNode => n !== null)
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    // For team scope or non-full-access roles
    if (currentUser.role === "MANAGER") {
      // Manager sees themselves as root with their reports
      const managerTree = buildTree(currentUser.id);
      return managerTree ? [managerTree] : [];
    }

    // For EMPLOYEE or other roles: show their manager and peers
    const currentUserData = userMap.get(currentUser.id);
    if (!currentUserData?.managerUserId) {
      // No manager - show just themselves
      const selfNode = currentUserData ? buildNode(currentUserData) : null;
      return selfNode ? [selfNode] : [];
    }

    // Show manager's tree (which includes the current user as a child)
    const managerTree = buildTree(currentUserData.managerUserId);
    return managerTree ? [managerTree] : [];
  },

  /**
   * Create a new user
   * - Checks for duplicate email and SAP number
   * - Hashes password using better-auth utilities
   * - Returns user without password hash
   */
  async create(input: CreateUserInput): Promise<UserResponse> {
    const {
      name,
      password,
      sapNo,
      role,
      status,
      departmentId,
      reportsToSlotCode,
    } = input;

    // Normalize email to lowercase (Better Auth does case-sensitive lookups)
    const email = input.email.toLowerCase();

    // Check for duplicate email
    const existingByEmail = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existingByEmail.length > 0) {
      throw new AppError(
        "CONFLICT",
        "A user with this email already exists",
        409,
      );
    }

    // Check for duplicate SAP number
    const existingBySapNo = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.sapNo, sapNo))
      .limit(1);

    if (existingBySapNo.length > 0) {
      throw new AppError(
        "CONFLICT",
        "A user with this SAP number already exists",
        409,
      );
    }

    // Hash password using better-auth
    const hashedPassword = await hashPassword(password);

    // Generate unique IDs
    const userId = randomUUID();
    const accountId = randomUUID();
    const now = new Date();

    if (reportsToSlotCode) {
      await resolveManagerUserIdBySlotCode(db, reportsToSlotCode);
    }

    // Insert user record (passwordHash is null - Better Auth stores password in account table)
    await db.insert(user).values({
      id: userId,
      name,
      email,
      emailVerified: false,
      sapNo,
      role: role ?? "EMPLOYEE",
      status: status ?? "ACTIVE",
      departmentId: departmentId ?? null,
      passwordHash: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Insert account record with hashed password (Better Auth pattern)
    await db.insert(account).values({
      id: accountId,
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    });

    const manager = db
      .select({
        id: user.id,
        name: user.name,
      })
      .from(user)
      .as("manager");

    const [createdUserRow] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        sapNo: user.sapNo,
        role: user.role,
        status: user.status,
        departmentId: user.departmentId,
        departmentName: department.name,
        managerSlotCode: sql<string | null>`null`,
        managerName: sql<string | null>`null`,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .leftJoin(department, eq(user.departmentId, department.id))
      .leftJoin(manager, sql`1 = 0`)
      .where(eq(user.id, userId))
      .limit(1);

    if (!createdUserRow) {
      throw new AppError("INTERNAL_ERROR", "Failed to create user", 500);
    }

    const [createdUser] = await withSlotManagers(db, [createdUserRow]);
    if (!createdUser) {
      throw new AppError("INTERNAL_ERROR", "Failed to create user", 500);
    }

    return toUserResponse(createdUser);
  },

  /**
   * Get a user by ID
   * - Fetches user with department and manager joins
   * - Returns user without password hash
   * - Returns null if user not found
   */
  async getById(userId: string): Promise<UserResponse | null> {
    const manager = db
      .select({
        id: user.id,
        name: user.name,
      })
      .from(user)
      .as("manager");

    const [foundUserRow] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        sapNo: user.sapNo,
        role: user.role,
        status: user.status,
        departmentId: user.departmentId,
        departmentName: department.name,
        managerSlotCode: sql<string | null>`null`,
        managerName: sql<string | null>`null`,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .leftJoin(department, eq(user.departmentId, department.id))
      .leftJoin(manager, sql`1 = 0`)
      .where(eq(user.id, userId))
      .limit(1);

    if (!foundUserRow) {
      return null;
    }

    const [foundUser] = await withSlotManagers(db, [foundUserRow]);
    if (!foundUser) {
      return null;
    }

    return toUserResponse(foundUser);
  },

  /**
   * Update an existing user
   * - Verifies user exists
   * - Checks for duplicate email/SAP if changed
   * - Updates only provided fields
   * - Returns user without password hash
   */
  async update(input: UpdateUserInput): Promise<UserResponse> {
    const {
      id,
      name,
      email,
      sapNo,
      role,
      status,
      departmentId,
      reportsToSlotCode,
    } = input;

    // Verify user exists
    const [existingUserRecord] = await db
      .select({
        id: user.id,
        email: user.email,
        sapNo: user.sapNo,
      })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    if (!existingUserRecord) {
      throw new AppError("NOT_FOUND", "User not found", 404);
    }

    // Check for duplicate email if changed
    if (email !== undefined && email !== existingUserRecord.email) {
      const existingByEmail = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, email))
        .limit(1);

      if (existingByEmail.length > 0) {
        throw new AppError(
          "CONFLICT",
          "A user with this email already exists",
          409,
        );
      }
    }

    // Check for duplicate SAP number if changed
    if (sapNo !== undefined && sapNo !== existingUserRecord.sapNo) {
      const existingBySapNo = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.sapNo, sapNo))
        .limit(1);

      if (existingBySapNo.length > 0) {
        throw new AppError(
          "CONFLICT",
          "A user with this SAP number already exists",
          409,
        );
      }
    }

    // Build update object with only provided fields
    const updateData: Partial<{
      name: string;
      email: string;
      sapNo: string;
      role: "EMPLOYEE" | "MANAGER" | "HR" | "FINANCE" | "CEO" | "IT" | "ADMIN";
      status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
      departmentId: string | null;
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name;
    }
    if (email !== undefined) {
      updateData.email = email;
    }
    if (sapNo !== undefined) {
      updateData.sapNo = sapNo;
    }
    if (role !== undefined) {
      updateData.role = role;
    }
    if (status !== undefined) {
      updateData.status = status;
    }
    if (departmentId !== undefined) {
      updateData.departmentId = departmentId;
    }
    if (reportsToSlotCode) {
      await resolveManagerUserIdBySlotCode(db, reportsToSlotCode);
    }

    // Update user record
    await db.update(user).set(updateData).where(eq(user.id, id));

    const manager = db
      .select({
        id: user.id,
        name: user.name,
      })
      .from(user)
      .as("manager");

    const [updatedUserRow] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        sapNo: user.sapNo,
        role: user.role,
        status: user.status,
        departmentId: user.departmentId,
        departmentName: department.name,
        managerSlotCode: sql<string | null>`null`,
        managerName: sql<string | null>`null`,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .leftJoin(department, eq(user.departmentId, department.id))
      .leftJoin(manager, sql`1 = 0`)
      .where(eq(user.id, id))
      .limit(1);

    if (!updatedUserRow) {
      throw new AppError("INTERNAL_ERROR", "Failed to update user", 500);
    }

    const [updatedUser] = await withSlotManagers(db, [updatedUserRow]);
    if (!updatedUser) {
      throw new AppError("INTERNAL_ERROR", "Failed to update user", 500);
    }

    return toUserResponse(updatedUser);
  },

  /**
   * Deactivate a user (soft delete)
   * - Updates user status to INACTIVE
   * - Revokes all active sessions for the user
   */
  async deactivate(userId: string): Promise<void> {
    // Verify user exists
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!existingUser) {
      throw new AppError("NOT_FOUND", "User not found", 404);
    }

    // Update user status to INACTIVE
    await db
      .update(user)
      .set({
        status: "INACTIVE",
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));

    // Revoke all sessions for the user
    await db.delete(session).where(eq(session.userId, userId));
  },

  /**
   * Delete a user (hard delete)
   * - Permanently removes the user record
   * - Cascades to sessions/accounts via foreign key constraints
   */
  async delete(userId: string): Promise<void> {
    // Verify user exists
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!existingUser) {
      throw new AppError("NOT_FOUND", "User not found", 404);
    }

    // Delete user record - sessions/accounts cascade delete via FK constraints
    await db.delete(user).where(eq(user.id, userId));
  },

  /**
   * Get all sessions for a user
   * - Fetches all sessions for the specified user
   * - Returns session list with id, createdAt, expiresAt, ipAddress, userAgent
   */
  async getSessions(userId: string): Promise<UserSession[]> {
    const sessions = await db
      .select({
        id: session.id,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      })
      .from(session)
      .where(eq(session.userId, userId));

    return sessions;
  },

  /**
   * Revoke a specific session by ID
   * - Deletes the session record from the database
   * - Immediately invalidates the session token
   */
  async revokeSession(sessionId: string): Promise<void> {
    await db.delete(session).where(eq(session.id, sessionId));
  },

  /**
   * Revoke all sessions for a user
   * - Deletes all session records for the specified user
   * - Immediately invalidates all session tokens for the user
   */
  async revokeAllSessions(userId: string): Promise<void> {
    await db.delete(session).where(eq(session.userId, userId));
  },

  /**
   * Reset a user's password
   * - Hashes the new password using better-auth utilities
   * - Updates the password in the account table (Better Auth pattern)
   * - Revokes all active sessions for the user
   * - Returns void (success confirmation without exposing password)
   */
  async resetPassword(userId: string, newPassword: string): Promise<void> {
    // Verify user exists
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!existingUser) {
      throw new AppError("NOT_FOUND", "User not found", 404);
    }

    // Hash new password using better-auth
    const hashedPassword = await hashPassword(newPassword);

    // Update account password (Better Auth stores password in account table)
    await db
      .update(account)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(account.userId, userId));

    // Revoke all sessions for the user
    await db.delete(session).where(eq(session.userId, userId));
  },
});

export type UsersService = ReturnType<typeof createUsersService>;
