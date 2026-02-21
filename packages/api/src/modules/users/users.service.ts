import { randomUUID } from "node:crypto";
import { hashPassword } from "@zenith-hr/auth";
import type { DbOrTx } from "@zenith-hr/db";
import { account, session, user } from "@zenith-hr/db/schema/auth";
import { businessTrip } from "@zenith-hr/db/schema/business-trips";
import { department } from "@zenith-hr/db/schema/departments";
import { importHistory } from "@zenith-hr/db/schema/import-history";
import { jobDescription } from "@zenith-hr/db/schema/job-descriptions";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { performanceReview } from "@zenith-hr/db/schema/performance";
import {
  jobPosition,
  userPositionAssignment,
} from "@zenith-hr/db/schema/position-slots";
import { separationRequest } from "@zenith-hr/db/schema/separations";
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
  OffboardingPrecheckResult,
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

const MANPOWER_OPERATIONAL_STATUSES = [
  "PENDING_MANAGER",
  "PENDING_HR",
  "PENDING_FINANCE",
  "PENDING_CEO",
  "APPROVED_OPEN",
  "HIRING_IN_PROGRESS",
] as const;

const BUSINESS_TRIP_OPERATIONAL_STATUSES = [
  "PENDING_MANAGER",
  "PENDING_HR",
  "PENDING_FINANCE",
  "PENDING_CEO",
  "APPROVED",
] as const;

const SEPARATION_OPERATIONAL_STATUSES = [
  "REQUESTED",
  "PENDING_MANAGER",
  "PENDING_HR",
  "CLEARANCE_IN_PROGRESS",
] as const;

const PERFORMANCE_OPERATIONAL_STATUSES = [
  "DRAFT",
  "SELF_REVIEW",
  "MANAGER_REVIEW",
  "IN_REVIEW",
  "SUBMITTED",
  "ACKNOWLEDGED",
] as const;

function createEmptyPrecheck(userId: string): OffboardingPrecheckResult {
  return {
    userId,
    counts: {
      slotAssignments: 0,
      manpowerRequests: 0,
      businessTrips: 0,
      separations: 0,
      performanceReviews: 0,
      importHistory: 0,
    },
    details: {
      slotAssignments: [],
      manpowerRequests: [],
      businessTrips: [],
      separations: [],
      performanceReviews: [],
      importHistory: [],
    },
    hasOperationalBlockers: false,
    hasDeleteBlockers: false,
    canDeactivate: true,
    canDelete: true,
  };
}

function computePrecheckFlags(precheck: OffboardingPrecheckResult) {
  const hasOperationalBlockers =
    precheck.counts.slotAssignments > 0 ||
    precheck.counts.manpowerRequests > 0 ||
    precheck.counts.businessTrips > 0 ||
    precheck.counts.separations > 0 ||
    precheck.counts.performanceReviews > 0;
  const hasDeleteBlockers =
    hasOperationalBlockers || precheck.counts.importHistory > 0;

  precheck.hasOperationalBlockers = hasOperationalBlockers;
  precheck.hasDeleteBlockers = hasDeleteBlockers;
  precheck.canDeactivate = !hasOperationalBlockers;
  precheck.canDelete = !hasDeleteBlockers;
}

async function resolveAndCreatePosition(
  db: DbOrTx,
  jobDescriptionId: string,
  userName: string,
): Promise<{
  positionId: string;
  derivedDepartmentId: string | null;
  derivedRole:
    | "EMPLOYEE"
    | "MANAGER"
    | "HR"
    | "FINANCE"
    | "CEO"
    | "IT"
    | "ADMIN";
}> {
  const [jd] = await db
    .select({
      id: jobDescription.id,
      title: jobDescription.title,
      departmentId: jobDescription.departmentId,
      reportsToPositionId: jobDescription.reportsToPositionId,
      assignedRole: jobDescription.assignedRole,
    })
    .from(jobDescription)
    .where(eq(jobDescription.id, jobDescriptionId))
    .limit(1);

  if (!jd) {
    throw AppError.badRequest("Job description not found");
  }

  const positionCode = `POS_${Date.now()}_${randomUUID().slice(0, 4).toUpperCase()}`;

  const positionId = randomUUID();

  await db.insert(jobPosition).values({
    id: positionId,
    code: positionCode,
    name: `${userName} — ${jd.title}`,
    departmentId: jd.departmentId,
    jobDescriptionId: jd.id,
    reportsToPositionId: jd.reportsToPositionId,
    active: true,
  });

  return {
    positionId,
    derivedDepartmentId: jd.departmentId,
    derivedRole: jd.assignedRole,
  };
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
      reportsToPositionId: string | null;
      positionId: string | null;
      positionCode: string | null;
      positionName: string | null;
      jobDescriptionTitle: string | null;
    }
  >
> {
  const managerMap = new Map<
    string,
    {
      managerUserId: string | null;
      managerName: string | null;
      reportsToPositionId: string | null;
      positionId: string | null;
      positionCode: string | null;
      positionName: string | null;
      jobDescriptionTitle: string | null;
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
    SELECT
      upa.user_id AS user_id,
      upa.position_id AS position_id,
      jp.code AS position_code,
      jp.name AS position_name,
      jp.reports_to_position_id AS reports_to_position_id,
      jd.title AS job_description_title,
      manager_assignment.user_id AS manager_user_id,
      manager_user.name AS manager_name
    FROM user_position_assignment upa
    LEFT JOIN job_position jp ON jp.id = upa.position_id
    LEFT JOIN job_description jd ON jd.id = jp.job_description_id
    LEFT JOIN user_position_assignment manager_assignment
      ON manager_assignment.position_id = jp.reports_to_position_id
    LEFT JOIN "user" manager_user ON manager_user.id = manager_assignment.user_id
    WHERE upa.user_id IN (${userIdList})
  `);

  for (const row of managerRows.rows as Array<{
    user_id: string;
    position_id: string | null;
    position_code: string | null;
    position_name: string | null;
    reports_to_position_id: string | null;
    job_description_title: string | null;
    manager_user_id: string | null;
    manager_name: string | null;
  }>) {
    managerMap.set(row.user_id, {
      managerUserId: row.manager_user_id,
      managerName: row.manager_name,
      reportsToPositionId: row.reports_to_position_id,
      positionId: row.position_id,
      positionCode: row.position_code,
      positionName: row.position_name,
      jobDescriptionTitle: row.job_description_title,
    });
  }

  return managerMap;
}

async function withSlotManagers<
  T extends {
    id: string;
    managerName?: string | null;
    reportsToPositionId?: string | null;
    positionId?: string | null;
    positionCode?: string | null;
    positionName?: string | null;
    jobDescriptionTitle?: string | null;
  },
>(
  db: DbOrTx,
  rows: T[],
): Promise<
  Array<
    T & {
      managerName: string | null;
      reportsToPositionId: string | null;
      positionId: string | null;
      positionCode: string | null;
      positionName: string | null;
      jobDescriptionTitle: string | null;
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
          reportsToPositionId: string | null;
          positionId: string | null;
          positionCode: string | null;
          positionName: string | null;
          jobDescriptionTitle: string | null;
        }
      >();

  return rows.map((row) => {
    const manager = supportsExecute
      ? managerMap.get(row.id)
      : {
          managerName: row.managerName ?? null,
          reportsToPositionId: row.reportsToPositionId ?? null,
          positionId: row.positionId ?? null,
          positionCode: row.positionCode ?? null,
          positionName: row.positionName ?? null,
          jobDescriptionTitle: row.jobDescriptionTitle ?? null,
        };

    return {
      ...row,
      managerName: manager?.managerName ?? null,
      reportsToPositionId: manager?.reportsToPositionId ?? null,
      positionId: manager?.positionId ?? null,
      positionCode: manager?.positionCode ?? null,
      positionName: manager?.positionName ?? null,
      jobDescriptionTitle: manager?.jobDescriptionTitle ?? null,
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
    | "positionId"
    | "positionCode"
    | "positionName"
    | "reportsToPositionId"
    | "jobDescriptionTitle"
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
    positionId: row.positionId,
    positionCode: row.positionCode,
    positionName: row.positionName,
    reportsToPositionId: row.reportsToPositionId,
    jobDescriptionTitle: row.jobDescriptionTitle,
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
        primaryPositionCode: jobPosition.code,
      })
      .from(user)
      .leftJoin(department, eq(user.departmentId, department.id))
      .leftJoin(
        userPositionAssignment,
        eq(userPositionAssignment.userId, user.id),
      )
      .leftJoin(
        jobPosition,
        eq(jobPosition.id, userPositionAssignment.positionId),
      );

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
          positionId: sql<string | null>`null`,
          positionCode: sql<string | null>`null`,
          positionName: sql<string | null>`null`,
          reportsToPositionId: sql<string | null>`null`,
          jobDescriptionTitle: sql<string | null>`null`,
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
    const [managerPosition] = await db
      .select({ positionId: userPositionAssignment.positionId })
      .from(userPositionAssignment)
      .where(eq(userPositionAssignment.userId, managerId))
      .limit(1);

    if (!managerPosition?.positionId) {
      return [];
    }

    const result = await db.execute(sql`
      WITH RECURSIVE subordinate_positions AS (
        SELECT id AS position_id
        FROM job_position
        WHERE reports_to_position_id = ${managerPosition.positionId}

        UNION ALL

        SELECT jp.id AS position_id
        FROM job_position jp
        INNER JOIN subordinate_positions sp ON jp.reports_to_position_id = sp.position_id
      )
      SELECT upa.user_id AS id
      FROM subordinate_positions sp
      INNER JOIN user_position_assignment upa ON upa.position_id = sp.position_id
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
   * Returns positions in a nested tree structure (position-centric, infinite-depth vacancies).
   * Walks UP from every active-user-occupied position to discover all ancestor positions at any
   * depth, then builds a recursive HierarchyNode tree where each position is either a user node
   * or a vacancy placeholder — no depth limits, no special-casing.
   */
  async getHierarchy(
    currentUser: CurrentUser,
    scope: "team" | "organization",
  ): Promise<HierarchyNode[]> {
    // const isFullAccessRole = FULL_ACCESS_ROLES.includes(currentUser.role);

    // Recursive CTE: start from positions occupied by active users, walk UP to find all ancestor
    // positions at any depth — this naturally captures vacant positions in the chain.
    const hierarchyResult = await db.execute(sql`
      WITH RECURSIVE all_relevant_positions AS (
        -- Base: every position currently occupied by an active user
        SELECT jp.id AS position_id, jp.reports_to_position_id
        FROM job_position jp
        WHERE EXISTS (
          SELECT 1 FROM user_position_assignment upa
          JOIN "user" u ON u.id = upa.user_id AND u.status = 'ACTIVE'
          WHERE upa.position_id = jp.id
        )
        UNION
        -- Recursive: walk up to parent positions (captures vacant ancestors at any depth)
        SELECT jp.id, jp.reports_to_position_id
        FROM job_position jp
        INNER JOIN all_relevant_positions arp ON jp.id = arp.reports_to_position_id
      )
      SELECT
        arp.position_id,
        arp.reports_to_position_id,
        jp.name            AS position_name,
        d.name             AS position_dept,
        upa.user_id,
        u.name             AS user_name,
        u.email            AS user_email,
        u.sap_no           AS user_sap_no,
        u.role             AS user_role,
        u.status           AS user_status,
        ud.name            AS user_dept
      FROM all_relevant_positions arp
      JOIN  job_position jp  ON jp.id = arp.position_id
      LEFT JOIN department d ON d.id = jp.department_id
      LEFT JOIN user_position_assignment upa ON upa.position_id = arp.position_id
      LEFT JOIN "user" u  ON u.id = upa.user_id AND u.status = 'ACTIVE'
      LEFT JOIN department ud ON ud.id = u.department_id
    `);

    interface HierarchyRow {
      position_id: string;
      reports_to_position_id: string | null;
      position_name: string;
      position_dept: string | null;
      user_id: string | null;
      user_name: string | null;
      user_email: string | null;
      user_sap_no: string | null;
      user_role: string | null;
      user_status: string | null;
      user_dept: string | null;
    }

    const rows = hierarchyResult.rows as unknown as HierarchyRow[];

    if (rows.length === 0) {
      return [];
    }

    // positionMap: one row per position — prefer occupied (user_id != null) over vacant duplicate
    const positionMap = new Map<string, HierarchyRow>();
    for (const row of rows) {
      const existing = positionMap.get(row.position_id);
      if (!existing || (row.user_id && !existing.user_id)) {
        positionMap.set(row.position_id, row);
      }
    }

    // userPositionMap: userId → positionId (for team-scope lookups)
    const userPositionMap = new Map<string, string>();
    for (const row of rows) {
      if (row.user_id) {
        userPositionMap.set(row.user_id, row.position_id);
      }
    }

    // childrenMap: parentPositionId → child positionIds
    // A position is a root (null key) when its parent is outside the relevant set or null.
    const childrenMap = new Map<string | null, string[]>();
    for (const row of positionMap.values()) {
      const parentKey =
        row.reports_to_position_id !== null &&
        positionMap.has(row.reports_to_position_id)
          ? row.reports_to_position_id
          : null;
      const list = childrenMap.get(parentKey) ?? [];
      list.push(row.position_id);
      childrenMap.set(parentKey, list);
    }

    // Recursively build a HierarchyNode for the given position at any depth.
    // Returns a user node when occupied, or a vacancy placeholder when empty.
    function buildNode(posId: string): HierarchyNode | null {
      const row = positionMap.get(posId);
      if (!row) {
        return null;
      }

      const childIds = childrenMap.get(posId) ?? [];
      const children: HierarchyNode[] = childIds
        .map(buildNode)
        .filter((n): n is HierarchyNode => n !== null)
        .sort((a, b) => a.name.localeCompare(b.name));

      if (!row.user_id) {
        // Vacant position — ghost node
        return {
          id: `vacancy-${row.position_id}`,
          name: row.position_name,
          email: "",
          sapNo: "",
          role: "EMPLOYEE" as const,
          status: "ACTIVE" as const,
          departmentName: row.position_dept ?? null,
          positionName: row.position_name,
          isVacancy: true,
          children,
        };
      }

      return {
        id: row.user_id,
        name: row.user_name ?? "",
        email: row.user_email ?? "",
        sapNo: row.user_sap_no ?? "",
        role: (row.user_role as HierarchyNode["role"]) ?? "EMPLOYEE",
        status: (row.user_status as HierarchyNode["status"]) ?? "ACTIVE",
        departmentName: row.user_dept ?? null,
        positionName: row.position_name,
        isVacancy: false,
        children,
      };
    }

    // Organization scope: build full tree from all root positions
    if (scope === "organization") {
      const rootIds = childrenMap.get(null) ?? [];
      return rootIds
        .map(buildNode)
        .filter((n): n is HierarchyNode => n !== null)
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    // Team scope: build subtree rooted at the current user's position.
    const currentUserPosId = userPositionMap.get(currentUser.id);
    if (!currentUserPosId) {
      return [];
    }

    const directReportPosIds = childrenMap.get(currentUserPosId) ?? [];
    if (directReportPosIds.length > 0) {
      // Current user manages others — show their own subtree
      const selfNode = buildNode(currentUserPosId);
      return selfNode ? [selfNode] : [];
    }

    // Leaf node: show peers under the same manager position
    const currentPosRow = positionMap.get(currentUserPosId);
    const managerPosId = currentPosRow?.reports_to_position_id ?? null;

    if (!(managerPosId && positionMap.has(managerPosId))) {
      const selfNode = buildNode(currentUserPosId);
      return selfNode ? [selfNode] : [];
    }

    const managerNode = buildNode(managerPosId);
    return managerNode ? [managerNode] : [];
  },

  /**
   * Create a new user
   * - Checks for duplicate email and SAP number
   * - Hashes password using better-auth utilities
   * - Returns user without password hash
   */
  async create(input: CreateUserInput): Promise<UserResponse> {
    const { name, password, sapNo, status, jobDescriptionId } = input;

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

    const derivedProfile = await resolveAndCreatePosition(
      db,
      jobDescriptionId,
      name,
    );

    // Insert user record (passwordHash is null - Better Auth stores password in account table)
    await db.insert(user).values({
      id: userId,
      name,
      email,
      emailVerified: false,
      sapNo,
      role: derivedProfile.derivedRole,
      status: status ?? "ACTIVE",
      departmentId: derivedProfile.derivedDepartmentId,
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

    await db.insert(userPositionAssignment).values({
      userId,
      positionId: derivedProfile.positionId,
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
        positionId: sql<string | null>`null`,
        positionCode: sql<string | null>`null`,
        positionName: sql<string | null>`null`,
        reportsToPositionId: sql<string | null>`null`,
        jobDescriptionTitle: sql<string | null>`null`,
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
        positionId: sql<string | null>`null`,
        positionCode: sql<string | null>`null`,
        positionName: sql<string | null>`null`,
        reportsToPositionId: sql<string | null>`null`,
        jobDescriptionTitle: sql<string | null>`null`,
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
    const { id, name, email, sapNo, status, jobDescriptionId } = input;

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
    if (status !== undefined) {
      updateData.status = status;
    }
    if (jobDescriptionId !== undefined) {
      // Get the user's current name for position naming
      const userName: string =
        name ??
        (await db
          .select({ name: user.name })
          .from(user)
          .where(eq(user.id, id))
          .limit(1)
          .then((rows) => rows[0]?.name ?? "Unknown"));

      const derivedProfile = await resolveAndCreatePosition(
        db,
        jobDescriptionId,
        userName,
      );
      updateData.role = derivedProfile.derivedRole;
      updateData.departmentId = derivedProfile.derivedDepartmentId;

      // Update user record first
      await db.update(user).set(updateData).where(eq(user.id, id));

      // Reassign position
      const [existingAssignment] = await db
        .select({ id: userPositionAssignment.id })
        .from(userPositionAssignment)
        .where(eq(userPositionAssignment.userId, id))
        .limit(1);

      if (existingAssignment) {
        await db
          .update(userPositionAssignment)
          .set({ positionId: derivedProfile.positionId, updatedAt: new Date() })
          .where(eq(userPositionAssignment.id, existingAssignment.id));
      } else {
        await db.insert(userPositionAssignment).values({
          userId: id,
          positionId: derivedProfile.positionId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } else {
      // No job description change — just update user fields
      await db.update(user).set(updateData).where(eq(user.id, id));
    }

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
        positionId: sql<string | null>`null`,
        positionCode: sql<string | null>`null`,
        positionName: sql<string | null>`null`,
        reportsToPositionId: sql<string | null>`null`,
        jobDescriptionTitle: sql<string | null>`null`,
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

    const precheck = await this.offboardingPrecheck(userId);
    if (!precheck.canDeactivate) {
      throw new AppError(
        "CONFLICT",
        "Cannot deactivate user due to active offboarding blockers. Run offboarding precheck and resolve blockers first.",
        409,
      );
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

    const precheck = await this.offboardingPrecheck(userId);
    if (!precheck.canDelete) {
      throw new AppError(
        "CONFLICT",
        "Cannot delete user due to active offboarding blockers. Run offboarding precheck and resolve blockers first.",
        409,
      );
    }

    // Delete user record - sessions/accounts cascade delete via FK constraints
    await db.delete(user).where(eq(user.id, userId));
  },

  async forceDelete(userId: string): Promise<void> {
    // Verify user exists
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!existingUser) {
      throw new AppError("NOT_FOUND", "User not found", 404);
    }

    const precheck = await this.offboardingPrecheck(userId);
    if (precheck.counts.importHistory > 0) {
      throw new AppError(
        "CONFLICT",
        "Cannot force delete user with import history references. Preserve history or migrate references first.",
        409,
      );
    }

    // Delete user record - sessions/accounts cascade delete via FK constraints
    await db.delete(user).where(eq(user.id, userId));
  },

  async offboardingPrecheck(
    userId: string,
  ): Promise<OffboardingPrecheckResult> {
    // Verify user exists
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!existingUser) {
      throw new AppError("NOT_FOUND", "User not found", 404);
    }

    const precheck = createEmptyPrecheck(userId);
    const supportsExecute =
      typeof (db as { execute?: unknown }).execute === "function";

    if (!supportsExecute) {
      computePrecheckFlags(precheck);
      return precheck;
    }

    const [
      activeAssignments,
      manpowerRows,
      tripRows,
      separationRows,
      performanceRows,
      importHistoryRows,
    ] = await Promise.all([
      db
        .select({ id: userPositionAssignment.id })
        .from(userPositionAssignment)
        .where(eq(userPositionAssignment.userId, userId))
        .limit(25),
      db
        .select({
          id: manpowerRequest.id,
          status: manpowerRequest.status,
        })
        .from(manpowerRequest)
        .where(
          and(
            inArray(manpowerRequest.status, MANPOWER_OPERATIONAL_STATUSES),
            or(
              eq(manpowerRequest.requesterId, userId),
              eq(manpowerRequest.currentApproverId, userId),
            ),
          ),
        )
        .limit(50),
      db
        .select({
          id: businessTrip.id,
          status: businessTrip.status,
        })
        .from(businessTrip)
        .where(
          and(
            inArray(businessTrip.status, BUSINESS_TRIP_OPERATIONAL_STATUSES),
            or(
              eq(businessTrip.requesterId, userId),
              eq(businessTrip.currentApproverId, userId),
            ),
          ),
        )
        .limit(50),
      db
        .select({
          id: separationRequest.id,
          status: separationRequest.status,
        })
        .from(separationRequest)
        .where(
          and(
            inArray(separationRequest.status, SEPARATION_OPERATIONAL_STATUSES),
            or(
              eq(separationRequest.employeeId, userId),
              eq(separationRequest.managerId, userId),
              eq(separationRequest.hrOwnerId, userId),
            ),
          ),
        )
        .limit(50),
      db
        .select({
          id: performanceReview.id,
          status: performanceReview.status,
        })
        .from(performanceReview)
        .where(
          and(
            inArray(performanceReview.status, PERFORMANCE_OPERATIONAL_STATUSES),
            or(
              eq(performanceReview.employeeId, userId),
              eq(performanceReview.reviewerId, userId),
            ),
          ),
        )
        .limit(50),
      db
        .select({ id: importHistory.id })
        .from(importHistory)
        .where(eq(importHistory.userId, userId))
        .limit(25),
    ]);

    precheck.counts.slotAssignments = activeAssignments.length;
    precheck.details.slotAssignments = activeAssignments.map((row) => ({
      id: row.id,
      status: null,
      reason: "Active position assignment must be cleared or reassigned",
    }));

    precheck.counts.manpowerRequests = manpowerRows.length;
    precheck.details.manpowerRequests = manpowerRows.map((row) => ({
      id: row.id,
      status: row.status,
      reason:
        "User is requester or current approver on an active manpower request",
    }));

    precheck.counts.businessTrips = tripRows.length;
    precheck.details.businessTrips = tripRows.map((row) => ({
      id: row.id,
      status: row.status,
      reason:
        "User is requester or current approver on an active business trip",
    }));

    precheck.counts.separations = separationRows.length;
    precheck.details.separations = separationRows.map((row) => ({
      id: row.id,
      status: row.status,
      reason: "User is employee, manager, or HR owner on an active separation",
    }));

    precheck.counts.performanceReviews = performanceRows.length;
    precheck.details.performanceReviews = performanceRows.map((row) => ({
      id: row.id,
      status: row.status,
      reason: "User is employee or reviewer on an active performance review",
    }));

    precheck.counts.importHistory = importHistoryRows.length;
    precheck.details.importHistory = importHistoryRows.map((row) => ({
      id: row.id,
      status: null,
      reason: "Import history references this user and can block hard delete",
    }));

    computePrecheckFlags(precheck);
    return precheck;
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
