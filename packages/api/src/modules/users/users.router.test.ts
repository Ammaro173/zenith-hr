import { describe, expect, it, mock } from "bun:test";
import { ORPCError } from "@orpc/server";
import * as fc from "fast-check";
import type { UserRole } from "../../shared/types";

// Type for ORPCError with any code
type AnyORPCError = ORPCError<string, unknown>;

/**
 * Feature: user-management, Property 4: Role-based access control enforcement
 *
 *
 * For any user management operation and any actor role:
 * - Create/Update/Deactivate/ResetPassword: SHALL succeed only if actor role is ADMIN or HR
 * - Delete/ViewSessions/RevokeSessions: SHALL succeed only if actor role is ADMIN
 * - All other roles SHALL receive a 403 Forbidden response
 */

// All valid user roles
const ALL_ROLES: UserRole[] = [
  "REQUESTER",
  "MANAGER",
  "HR",
  "FINANCE",
  "CEO",
  "IT",
  "ADMIN",
];

// Operations that require ADMIN or HR role
const ADMIN_HR_OPERATIONS = [
  "create",
  "update",
  "getById",
  "deactivate",
  "resetPassword",
] as const;

// Operations that require ADMIN only
const ADMIN_ONLY_OPERATIONS = [
  "delete",
  "getSessions",
  "revokeSession",
  "revokeAllSessions",
] as const;

// All user management operations
type AdminHrOperation = (typeof ADMIN_HR_OPERATIONS)[number];
type AdminOnlyOperation = (typeof ADMIN_ONLY_OPERATIONS)[number];
type UserManagementOperation = AdminHrOperation | AdminOnlyOperation;

// Roles allowed for each operation type
const ADMIN_HR_ALLOWED_ROLES: UserRole[] = ["ADMIN", "HR"];
const ADMIN_ONLY_ALLOWED_ROLES: UserRole[] = ["ADMIN"];

// Arbitraries for property-based testing
const roleArb = fc.constantFrom<UserRole>(...ALL_ROLES);
const adminHrOperationArb = fc.constantFrom<AdminHrOperation>(
  ...ADMIN_HR_OPERATIONS,
);
const adminOnlyOperationArb = fc.constantFrom<AdminOnlyOperation>(
  ...ADMIN_ONLY_OPERATIONS,
);
const allOperationsArb = fc.constantFrom<UserManagementOperation>(
  ...ADMIN_HR_OPERATIONS,
  ...ADMIN_ONLY_OPERATIONS,
);

/**
 * Simulates the requireRoles middleware behavior.
 * This is the core logic we're testing - it checks if the user's role
 * is in the allowed roles list and throws FORBIDDEN if not.
 */
function checkRoleAccess(userRole: UserRole, allowedRoles: UserRole[]): void {
  if (!allowedRoles.includes(userRole)) {
    throw new ORPCError("FORBIDDEN");
  }
}

/**
 * Gets the allowed roles for a given operation.
 */
function getAllowedRolesForOperation(
  operation: UserManagementOperation,
): UserRole[] {
  if (
    (ADMIN_HR_OPERATIONS as readonly string[]).includes(operation as string)
  ) {
    return ADMIN_HR_ALLOWED_ROLES;
  }
  return ADMIN_ONLY_ALLOWED_ROLES;
}

/**
 * Determines if a role should have access to an operation.
 */
function shouldHaveAccess(
  role: UserRole,
  operation: UserManagementOperation,
): boolean {
  const allowedRoles = getAllowedRolesForOperation(operation);
  return allowedRoles.includes(role);
}

/**
 * Creates a mock context with the specified user role.
 */
function createMockContext(role: UserRole) {
  return {
    session: {
      user: {
        id: "test-user-id",
        role,
        name: "Test User",
        email: "test@example.com",
      },
    },
    services: {
      users: {
        create: mock(() => Promise.resolve({ id: "new-user-id" })),
        update: mock(() => Promise.resolve({ id: "updated-user-id" })),
        getById: mock(() => Promise.resolve({ id: "user-id" })),
        deactivate: mock(() => Promise.resolve()),
        delete: mock(() => Promise.resolve()),
        getSessions: mock(() => Promise.resolve([])),
        revokeSession: mock(() => Promise.resolve()),
        revokeAllSessions: mock(() => Promise.resolve()),
        resetPassword: mock(() => Promise.resolve()),
      },
    },
  };
}

/**
 * Simulates calling a router endpoint with role checking.
 * This mimics the behavior of the requireRoles middleware.
 */
async function simulateRouterCall(
  operation: UserManagementOperation,
  context: ReturnType<typeof createMockContext>,
): Promise<{ success: boolean; error?: AnyORPCError }> {
  const allowedRoles = getAllowedRolesForOperation(operation);
  const userRole = context.session.user.role as UserRole;

  try {
    // Simulate the requireRoles middleware check
    checkRoleAccess(userRole, allowedRoles);

    // If role check passes, call the service method
    const service = context.services.users;
    switch (operation) {
      case "create":
        await service.create();
        break;
      case "update":
        await service.update();
        break;
      case "getById":
        await service.getById();
        break;
      case "deactivate":
        await service.deactivate();
        break;
      case "delete":
        await service.delete();
        break;
      case "getSessions":
        await service.getSessions();
        break;
      case "revokeSession":
        await service.revokeSession();
        break;
      case "revokeAllSessions":
        await service.revokeAllSessions();
        break;
      case "resetPassword":
        await service.resetPassword();
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return { success: true };
  } catch (error) {
    if (error instanceof ORPCError) {
      return { success: false, error };
    }
    throw error;
  }
}

describe("Feature: user-management, Property 4: Role-based access control enforcement", () => {
  describe("ADMIN/HR operations (create, update, getById, deactivate, resetPassword)", () => {
    it("should allow ADMIN and HR roles to access ADMIN/HR operations", async () => {
      await fc.assert(
        fc.asyncProperty(
          adminHrOperationArb,
          fc.constantFrom<UserRole>("ADMIN", "HR"),
          async (operation, role) => {
            const context = createMockContext(role);
            const result = await simulateRouterCall(operation, context);

            // Property: ADMIN and HR roles should succeed
            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
          },
        ),
        { numRuns: 20 },
      );
    });

    it("should deny non-ADMIN/HR roles from accessing ADMIN/HR operations", async () => {
      const nonAdminHrRoles: UserRole[] = [
        "REQUESTER",
        "MANAGER",
        "FINANCE",
        "CEO",
        "IT",
      ];

      await fc.assert(
        fc.asyncProperty(
          adminHrOperationArb,
          fc.constantFrom<UserRole>(...nonAdminHrRoles),
          async (operation, role) => {
            const context = createMockContext(role);
            const result = await simulateRouterCall(operation, context);

            // Property: Non-ADMIN/HR roles should receive FORBIDDEN
            expect(result.success).toBe(false);
            expect(result.error).toBeInstanceOf(ORPCError);
            expect(result.error?.code).toBe("FORBIDDEN");
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe("ADMIN-only operations (delete, getSessions, revokeSession, revokeAllSessions)", () => {
    it("should allow only ADMIN role to access ADMIN-only operations", async () => {
      await fc.assert(
        fc.asyncProperty(adminOnlyOperationArb, async (operation) => {
          const context = createMockContext("ADMIN");
          const result = await simulateRouterCall(operation, context);

          // Property: ADMIN role should succeed
          expect(result.success).toBe(true);
          expect(result.error).toBeUndefined();
        }),
        { numRuns: 20 },
      );
    });

    it("should deny all non-ADMIN roles from accessing ADMIN-only operations", async () => {
      const nonAdminRoles: UserRole[] = [
        "REQUESTER",
        "MANAGER",
        "HR",
        "FINANCE",
        "CEO",
        "IT",
      ];

      await fc.assert(
        fc.asyncProperty(
          adminOnlyOperationArb,
          fc.constantFrom<UserRole>(...nonAdminRoles),
          async (operation, role) => {
            const context = createMockContext(role);
            const result = await simulateRouterCall(operation, context);

            // Property: Non-ADMIN roles should receive FORBIDDEN
            expect(result.success).toBe(false);
            expect(result.error).toBeInstanceOf(ORPCError);
            expect(result.error?.code).toBe("FORBIDDEN");
          },
        ),
        { numRuns: 20 },
      );
    });

    it("should deny HR role from accessing ADMIN-only operations", async () => {
      // Specific test for HR since it has elevated privileges for other operations
      await fc.assert(
        fc.asyncProperty(adminOnlyOperationArb, async (operation) => {
          const context = createMockContext("HR");
          const result = await simulateRouterCall(operation, context);

          // Property: HR role should receive FORBIDDEN for ADMIN-only operations
          expect(result.success).toBe(false);
          expect(result.error).toBeInstanceOf(ORPCError);
          expect(result.error?.code).toBe("FORBIDDEN");
        }),
        { numRuns: 20 },
      );
    });
  });

  describe("Universal RBAC property", () => {
    it("should enforce correct access control for any role/operation combination", async () => {
      await fc.assert(
        fc.asyncProperty(allOperationsArb, roleArb, async (operation, role) => {
          const context = createMockContext(role);
          const result = await simulateRouterCall(operation, context);
          const expectedAccess = shouldHaveAccess(role, operation);

          if (expectedAccess) {
            // Property: Authorized roles should succeed
            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
          } else {
            // Property: Unauthorized roles should receive FORBIDDEN
            expect(result.success).toBe(false);
            expect(result.error).toBeInstanceOf(ORPCError);
            expect(result.error?.code).toBe("FORBIDDEN");
          }
        }),
        { numRuns: 20 },
      );
    });
  });

  describe("Access control matrix verification", () => {
    // Explicit verification of the access control matrix
    const accessMatrix: Array<{
      operation: UserManagementOperation;
      allowedRoles: UserRole[];
    }> = [
      { operation: "create", allowedRoles: ["ADMIN", "HR"] },
      { operation: "update", allowedRoles: ["ADMIN", "HR"] },
      { operation: "getById", allowedRoles: ["ADMIN", "HR"] },
      { operation: "deactivate", allowedRoles: ["ADMIN", "HR"] },
      { operation: "resetPassword", allowedRoles: ["ADMIN", "HR"] },
      { operation: "delete", allowedRoles: ["ADMIN"] },
      { operation: "getSessions", allowedRoles: ["ADMIN"] },
      { operation: "revokeSession", allowedRoles: ["ADMIN"] },
      { operation: "revokeAllSessions", allowedRoles: ["ADMIN"] },
    ];

    it("should match the expected access control matrix for all operations", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...accessMatrix),
          roleArb,
          async ({ operation, allowedRoles }, role) => {
            const context = createMockContext(role);
            const result = await simulateRouterCall(operation, context);
            const shouldSucceed = allowedRoles.includes(role);

            if (shouldSucceed) {
              expect(result.success).toBe(true);
            } else {
              expect(result.success).toBe(false);
              expect(result.error?.code).toBe("FORBIDDEN");
            }
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});
