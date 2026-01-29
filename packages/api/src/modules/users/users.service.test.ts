import { describe, expect, it, mock } from "bun:test";
import { verifyPassword } from "@zenith-hr/auth";
import * as fc from "fast-check";
import { AppError } from "../../shared/errors";
import type { CreateUserInput } from "./users.schema";
import { createUsersService } from "./users.service";

// Valid enum values
const VALID_ROLES = [
  "REQUESTER",
  "MANAGER",
  "HR",
  "FINANCE",
  "CEO",
  "IT",
  "ADMIN",
] as const;
const VALID_STATUSES = ["ACTIVE", "INACTIVE", "ON_LEAVE"] as const;

// Arbitraries for generating valid user input data
const validNameArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{0,99}$/);
const validPasswordArb = fc.stringMatching(/^[a-zA-Z0-9!@#$%^&*]{8,32}$/);
const validSapNoArb = fc.stringMatching(/^SAP[0-9]{4,10}$/);
const validEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{2,10}$/),
    fc.stringMatching(/^[a-z]{2,8}$/),
    fc.constantFrom("com", "org", "net", "io"),
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

// Arbitrary for generating valid CreateUserInput
const createUserInputArb: fc.Arbitrary<CreateUserInput> = fc.record({
  name: validNameArb,
  email: validEmailArb,
  password: validPasswordArb,
  sapNo: validSapNoArb,
  role: fc.constantFrom(...VALID_ROLES),
  status: fc.constantFrom(...VALID_STATUSES),
  departmentId: fc.option(fc.uuid(), { nil: null }),
  reportsToManagerId: fc.option(fc.uuid(), { nil: null }),
});

/**
 * Creates a mock database for testing user creation.
 * The mock tracks inserted users and accounts, simulating database behavior.
 * Properly handles the Drizzle ORM query patterns including subqueries with .as()
 */
function createMockDbForCreate() {
  const insertedUsers: Array<{
    id: string;
    name: string;
    email: string;
    sapNo: string;
    role: string;
    status: string;
    departmentId: string | null;
    reportsToManagerId: string | null;
    passwordHash: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  const insertedAccounts: Array<{
    id: string;
    accountId: string;
    providerId: string;
    userId: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  // Create a subquery mock that returns an object with the aliased fields
  const createSubqueryMock = () => ({
    id: "manager_id",
    name: "manager_name",
  });

  const mockDb = {
    select: mock(() => {
      return {
        from: mock(() => ({
          // For subquery creation (manager alias)
          as: mock(() => createSubqueryMock()),
          // For regular queries
          where: mock(() => ({
            limit: mock(() => {
              // Return empty array to indicate no duplicates
              return Promise.resolve([]);
            }),
          })),
          leftJoin: mock(() => ({
            leftJoin: mock(() => ({
              where: mock(() => ({
                limit: mock(() => {
                  // Return the last inserted user for the final select
                  const lastUser = insertedUsers.at(-1);
                  if (lastUser) {
                    return Promise.resolve([
                      {
                        id: lastUser.id,
                        name: lastUser.name,
                        email: lastUser.email,
                        sapNo: lastUser.sapNo,
                        role: lastUser.role,
                        status: lastUser.status,
                        departmentId: lastUser.departmentId,
                        departmentName: null,
                        reportsToManagerId: lastUser.reportsToManagerId,
                        managerName: null,
                        createdAt: lastUser.createdAt,
                        updatedAt: lastUser.updatedAt,
                      },
                    ]);
                  }
                  return Promise.resolve([]);
                }),
              })),
            })),
          })),
        })),
      };
    }),
    insert: mock((_table: unknown) => ({
      values: mock((values: unknown) => {
        // Check if this is a user or account insert based on the values structure
        const data = values as Record<string, unknown>;
        if ("providerId" in data) {
          // This is an account insert
          insertedAccounts.push(
            data as {
              id: string;
              accountId: string;
              providerId: string;
              userId: string;
              password: string;
              createdAt: Date;
              updatedAt: Date;
            },
          );
        } else {
          // This is a user insert
          insertedUsers.push(
            data as {
              id: string;
              name: string;
              email: string;
              sapNo: string;
              role: string;
              status: string;
              departmentId: string | null;
              reportsToManagerId: string | null;
              passwordHash: string | null;
              createdAt: Date;
              updatedAt: Date;
            },
          );
        }
        return Promise.resolve();
      }),
    })),
    getInsertedUsers: () => insertedUsers,
    getInsertedAccounts: () => insertedAccounts,
  };

  return mockDb;
}

/**
 * Creates a mock database that simulates duplicate email detection.
 */
function createMockDbWithDuplicateEmail() {
  let selectCallCount = 0;

  const mockDb = {
    select: mock(() => {
      selectCallCount++;
      const currentCall = selectCallCount;

      return {
        from: mock(() => ({
          as: mock(() => ({ id: "manager_id", name: "manager_name" })),
          where: mock(() => ({
            limit: mock(() => {
              // First call is email check - return existing user
              if (currentCall === 1) {
                return Promise.resolve([{ id: "existing-user-id" }]);
              }
              return Promise.resolve([]);
            }),
          })),
        })),
      };
    }),
  };

  return mockDb;
}

/**
 * Creates a mock database that simulates duplicate SAP number detection.
 */
function createMockDbWithDuplicateSapNo() {
  let selectCallCount = 0;

  const mockDb = {
    select: mock(() => {
      selectCallCount++;
      const currentCall = selectCallCount;

      return {
        from: mock(() => ({
          as: mock(() => ({ id: "manager_id", name: "manager_name" })),
          where: mock(() => ({
            limit: mock(() => {
              // First call is email check - no match
              if (currentCall === 1) {
                return Promise.resolve([]);
              }
              // Second call is SAP check - return existing user
              if (currentCall === 2) {
                return Promise.resolve([{ id: "existing-user-id" }]);
              }
              return Promise.resolve([]);
            }),
          })),
        })),
      };
    }),
  };

  return mockDb;
}

/**
 * Feature: user-management, Property 1: User creation preserves input data
 *
 * **Validates: Requirements 1.1, 1.6**
 *
 * For any valid user creation input (name, email, sapNo, role, status,
 * departmentId, reportsToManagerId), when the user is created successfully,
 * the returned user object SHALL contain all the provided input values
 * (except password).
 */
describe("Feature: user-management, Property 1: User creation preserves input data", () => {
  it("should preserve all input fields in the returned user object", async () => {
    await fc.assert(
      fc.asyncProperty(createUserInputArb, async (input) => {
        // Create a fresh mock for each test run
        const mockDb = createMockDbForCreate();
        const service = createUsersService(
          mockDb as unknown as Parameters<typeof createUsersService>[0],
        );

        const result = await service.create(input);

        // Verify all input fields are preserved in the response
        expect(result.name).toBe(input.name);
        expect(result.email).toBe(input.email);
        expect(result.sapNo).toBe(input.sapNo);
        expect(result.role).toBe(input.role);
        expect(result.status).toBe(input.status);
        expect(result.departmentId).toBe(input.departmentId ?? null);
        expect(result.reportsToManagerId).toBe(
          input.reportsToManagerId ?? null,
        );

        // Verify the response has required fields
        expect(result.id).toBeDefined();
        expect(typeof result.id).toBe("string");
        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.updatedAt).toBeInstanceOf(Date);
      }),
      { numRuns: 20 },
    );
  });

  it("should use default values when optional fields are not provided", async () => {
    // Test with minimal input (only required fields)
    const minimalInputArb = fc.record({
      name: validNameArb,
      email: validEmailArb,
      password: validPasswordArb,
      sapNo: validSapNoArb,
    });

    await fc.assert(
      fc.asyncProperty(minimalInputArb, async (input) => {
        const mockDb = createMockDbForCreate();
        const service = createUsersService(
          mockDb as unknown as Parameters<typeof createUsersService>[0],
        );

        const result = await service.create(input as CreateUserInput);

        // Verify defaults are applied
        expect(result.role).toBe("REQUESTER");
        expect(result.status).toBe("ACTIVE");
        expect(result.departmentId).toBeNull();
        expect(result.reportsToManagerId).toBeNull();
      }),
      { numRuns: 20 },
    );
  });
});

/**
 * Feature: user-management, Property 2: Password hashing invariant
 *
 * **Validates: Requirements 1.2**
 *
 * For any user creation operation, the stored password in the account table
 * SHALL NOT equal the plain text password, and SHALL be a valid hash that
 * can verify the original password.
 */
describe("Feature: user-management, Property 2: Password hashing invariant", () => {
  it("should hash password and store in account table, not user table", async () => {
    await fc.assert(
      fc.asyncProperty(createUserInputArb, async (input) => {
        const mockDb = createMockDbForCreate();
        const service = createUsersService(
          mockDb as unknown as Parameters<typeof createUsersService>[0],
        );

        await service.create(input);

        // Get the inserted user and account
        const insertedUsers = mockDb.getInsertedUsers();
        const insertedAccounts = mockDb.getInsertedAccounts();
        expect(insertedUsers.length).toBe(1);
        expect(insertedAccounts.length).toBe(1);

        const insertedUser = insertedUsers[0];
        const insertedAccount = insertedAccounts[0];
        if (!(insertedUser && insertedAccount)) {
          throw new Error("No user or account was inserted");
        }

        // Property: user.passwordHash should be null (Better Auth pattern)
        expect(insertedUser.passwordHash).toBeNull();

        // Property: account.password is NOT equal to plain text password
        expect(insertedAccount.password).not.toBe(input.password);

        // Property: account.password is a non-empty string (valid hash format)
        expect(typeof insertedAccount.password).toBe("string");
        expect(insertedAccount.password.length).toBeGreaterThan(0);

        // Property: account references the correct user
        expect(insertedAccount.userId).toBe(insertedUser.id);
        expect(insertedAccount.providerId).toBe("credential");
      }),
      { numRuns: 20 },
    );
  });

  it("should produce a hash that can verify the original password", async () => {
    await fc.assert(
      fc.asyncProperty(createUserInputArb, async (input) => {
        const mockDb = createMockDbForCreate();
        const service = createUsersService(
          mockDb as unknown as Parameters<typeof createUsersService>[0],
        );

        await service.create(input);

        const insertedAccounts = mockDb.getInsertedAccounts();
        const insertedAccount = insertedAccounts[0];
        if (!insertedAccount) {
          throw new Error("No account was inserted");
        }

        // Property: The hash can verify the original password
        const isValid = await verifyPassword({
          password: input.password,
          hash: insertedAccount.password,
        });
        expect(isValid).toBe(true);
      }),
      { numRuns: 5 },
    );
  });

  it("should produce a hash that rejects incorrect passwords", async () => {
    await fc.assert(
      fc.asyncProperty(
        createUserInputArb,
        validPasswordArb.filter((p) => p.length >= 8),
        async (input, wrongPassword) => {
          // Skip if wrong password happens to match
          if (wrongPassword === input.password) {
            return;
          }

          const mockDb = createMockDbForCreate();
          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          await service.create(input);

          const insertedAccounts = mockDb.getInsertedAccounts();
          const insertedAccount = insertedAccounts[0];
          if (!insertedAccount) {
            throw new Error("No account was inserted");
          }

          // Property: The hash rejects incorrect passwords
          const isValid = await verifyPassword({
            password: wrongPassword,
            hash: insertedAccount.password,
          });
          expect(isValid).toBe(false);
        },
      ),
      { numRuns: 5 },
    );
  });
});

/**
 * Feature: user-management, Property 3: Email and SAP number uniqueness (create)
 *
 * **Validates: Requirements 1.3, 1.4**
 *
 * For any user creation operation, if the email or SAP number already exists
 * for a different user, the operation SHALL be rejected with a CONFLICT error.
 */
describe("Feature: user-management, Property 3: Email and SAP number uniqueness (create)", () => {
  it("should reject creation when email already exists", async () => {
    await fc.assert(
      fc.asyncProperty(createUserInputArb, async (input) => {
        // Create mock with existing user having the same email
        const mockDb = createMockDbWithDuplicateEmail();

        const service = createUsersService(
          mockDb as unknown as Parameters<typeof createUsersService>[0],
        );

        // Property: Creation should be rejected with CONFLICT error
        try {
          await service.create(input);
          // Should not reach here
          expect(true).toBe(false);
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          const appError = error as AppError;
          expect(appError.code).toBe("CONFLICT");
          expect(appError.message).toContain("email");
        }
      }),
      { numRuns: 20 },
    );
  });

  it("should reject creation when SAP number already exists", async () => {
    await fc.assert(
      fc.asyncProperty(createUserInputArb, async (input) => {
        // Create mock with existing user having the same SAP number
        const mockDb = createMockDbWithDuplicateSapNo();

        const service = createUsersService(
          mockDb as unknown as Parameters<typeof createUsersService>[0],
        );

        // Property: Creation should be rejected with CONFLICT error
        try {
          await service.create(input);
          // Should not reach here
          expect(true).toBe(false);
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          const appError = error as AppError;
          expect(appError.code).toBe("CONFLICT");
          expect(appError.message).toContain("SAP");
        }
      }),
      { numRuns: 20 },
    );
  });

  it("should allow creation when email and SAP number are unique", async () => {
    await fc.assert(
      fc.asyncProperty(createUserInputArb, async (input) => {
        // Create mock with no existing users
        const mockDb = createMockDbForCreate();
        const service = createUsersService(
          mockDb as unknown as Parameters<typeof createUsersService>[0],
        );

        // Property: Creation should succeed
        const result = await service.create(input);
        expect(result).toBeDefined();
        expect(result.email).toBe(input.email);
        expect(result.sapNo).toBe(input.sapNo);
      }),
      { numRuns: 20 },
    );
  });
});

/**
 * Feature: user-management, Property 11: Response sanitization (create)
 *
 * **Validates: Requirements 1.6**
 *
 * For any user creation operation that returns user data, the response
 * SHALL NOT contain the passwordHash field.
 */
describe("Feature: user-management, Property 11: Response sanitization (create)", () => {
  it("should not include passwordHash in the response", async () => {
    await fc.assert(
      fc.asyncProperty(createUserInputArb, async (input) => {
        const mockDb = createMockDbForCreate();
        const service = createUsersService(
          mockDb as unknown as Parameters<typeof createUsersService>[0],
        );

        const result = await service.create(input);

        // Property: Response should NOT contain passwordHash
        expect("passwordHash" in result).toBe(false);
        expect(
          (result as unknown as Record<string, unknown>).passwordHash,
        ).toBeUndefined();
      }),
      { numRuns: 20 },
    );
  });

  it("should not include password in the response", async () => {
    await fc.assert(
      fc.asyncProperty(createUserInputArb, async (input) => {
        const mockDb = createMockDbForCreate();
        const service = createUsersService(
          mockDb as unknown as Parameters<typeof createUsersService>[0],
        );

        const result = await service.create(input);

        // Property: Response should NOT contain password
        expect("password" in result).toBe(false);
        expect(
          (result as unknown as Record<string, unknown>).password,
        ).toBeUndefined();
      }),
      { numRuns: 20 },
    );
  });

  it("should only include safe user fields in the response", async () => {
    const safeFields = [
      "id",
      "name",
      "email",
      "sapNo",
      "role",
      "status",
      "departmentId",
      "departmentName",
      "reportsToManagerId",
      "managerName",
      "createdAt",
      "updatedAt",
    ];

    await fc.assert(
      fc.asyncProperty(createUserInputArb, async (input) => {
        const mockDb = createMockDbForCreate();
        const service = createUsersService(
          mockDb as unknown as Parameters<typeof createUsersService>[0],
        );

        const result = await service.create(input);

        // Property: All keys in response should be in the safe fields list
        const resultKeys = Object.keys(result);
        for (const key of resultKeys) {
          expect(safeFields).toContain(key);
        }

        // Property: Sensitive fields should not be present
        expect("passwordHash" in result).toBe(false);
        expect("password" in result).toBe(false);
        expect("failedLoginAttempts" in result).toBe(false);
      }),
      { numRuns: 20 },
    );
  });
});

// ============================================
// Update User Property Tests
// ============================================

// Import UpdateUserInput type
import type { UpdateUserInput } from "./users.schema";

// Arbitrary for generating valid UpdateUserInput (partial updates)
// biome-ignore lint/correctness/noUnusedVariables://TODO
const updateUserInputArb: fc.Arbitrary<Omit<UpdateUserInput, "id">> = fc.record(
  {
    name: fc.option(validNameArb, { nil: undefined }),
    email: fc.option(validEmailArb, { nil: undefined }),
    sapNo: fc.option(validSapNoArb, { nil: undefined }),
    role: fc.option(fc.constantFrom(...VALID_ROLES), { nil: undefined }),
    status: fc.option(fc.constantFrom(...VALID_STATUSES), { nil: undefined }),
    departmentId: fc.option(fc.option(fc.uuid(), { nil: null }), {
      nil: undefined,
    }),
    reportsToManagerId: fc.option(fc.option(fc.uuid(), { nil: null }), {
      nil: undefined,
    }),
  },
  { requiredKeys: [] },
);

/**
 * Creates a mock database for testing user updates.
 * Tracks existing users and simulates database behavior for updates.
 */
function createMockDbForUpdate(existingUser: {
  id: string;
  name: string;
  email: string;
  sapNo: string;
  role: string;
  status: string;
  departmentId: string | null;
  reportsToManagerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const currentUser = { ...existingUser };
  let selectCallCount = 0;

  const mockDb = {
    select: mock(() => {
      selectCallCount++;
      const currentCall = selectCallCount;

      return {
        from: mock(() => ({
          // For subquery creation (manager alias)
          as: mock(() => ({ id: "manager_id", name: "manager_name" })),
          // For regular queries
          where: mock(() => ({
            limit: mock(() => {
              // First call: check if user exists (returns existing user)
              if (currentCall === 1) {
                return Promise.resolve([
                  {
                    id: currentUser.id,
                    email: currentUser.email,
                    sapNo: currentUser.sapNo,
                  },
                ]);
              }
              // Subsequent calls for email/SAP uniqueness checks - return empty (no duplicates)
              return Promise.resolve([]);
            }),
          })),
          leftJoin: mock(() => ({
            leftJoin: mock(() => ({
              where: mock(() => ({
                limit: mock(() => {
                  // Return the updated user for the final select
                  return Promise.resolve([
                    {
                      id: currentUser.id,
                      name: currentUser.name,
                      email: currentUser.email,
                      sapNo: currentUser.sapNo,
                      role: currentUser.role,
                      status: currentUser.status,
                      departmentId: currentUser.departmentId,
                      departmentName: null,
                      reportsToManagerId: currentUser.reportsToManagerId,
                      managerName: null,
                      createdAt: currentUser.createdAt,
                      updatedAt: currentUser.updatedAt,
                    },
                  ]);
                }),
              })),
            })),
          })),
        })),
      };
    }),
    update: mock(() => ({
      set: mock((updateData: Record<string, unknown>) => ({
        where: mock(() => {
          // Apply the update to currentUser
          if (updateData.name !== undefined) {
            currentUser.name = updateData.name as string;
          }
          if (updateData.email !== undefined) {
            currentUser.email = updateData.email as string;
          }
          if (updateData.sapNo !== undefined) {
            currentUser.sapNo = updateData.sapNo as string;
          }
          if (updateData.role !== undefined) {
            currentUser.role = updateData.role as string;
          }
          if (updateData.status !== undefined) {
            currentUser.status = updateData.status as string;
          }
          if (updateData.departmentId !== undefined) {
            currentUser.departmentId = updateData.departmentId as string | null;
          }
          if (updateData.reportsToManagerId !== undefined) {
            currentUser.reportsToManagerId = updateData.reportsToManagerId as
              | string
              | null;
          }
          if (updateData.updatedAt !== undefined) {
            currentUser.updatedAt = updateData.updatedAt as Date;
          }
          return Promise.resolve();
        }),
      })),
    })),
    getCurrentUser: () => currentUser,
  };

  return mockDb;
}

/**
 * Creates a mock database that simulates duplicate email detection on update.
 */
function createMockDbWithDuplicateEmailOnUpdate(existingUser: {
  id: string;
  email: string;
  sapNo: string;
}) {
  let selectCallCount = 0;

  const mockDb = {
    select: mock(() => {
      selectCallCount++;
      const currentCall = selectCallCount;

      return {
        from: mock(() => ({
          as: mock(() => ({ id: "manager_id", name: "manager_name" })),
          where: mock(() => ({
            limit: mock(() => {
              // First call: check if user exists
              if (currentCall === 1) {
                return Promise.resolve([
                  {
                    id: existingUser.id,
                    email: existingUser.email,
                    sapNo: existingUser.sapNo,
                  },
                ]);
              }
              // Second call: email uniqueness check - return existing user (duplicate)
              if (currentCall === 2) {
                return Promise.resolve([{ id: "other-user-id" }]);
              }
              return Promise.resolve([]);
            }),
          })),
        })),
      };
    }),
  };

  return mockDb;
}

/**
 * Creates a mock database that simulates duplicate SAP number detection on update.
 * Note: The update method checks SAP uniqueness ONLY if sapNo is being changed.
 * The service compares the new sapNo with the existing one before checking uniqueness.
 */
function createMockDbWithDuplicateSapNoOnUpdate(existingUser: {
  id: string;
  email: string;
  sapNo: string;
}) {
  let selectCallCount = 0;

  const mockDb = {
    select: mock(() => {
      selectCallCount++;
      const currentCall = selectCallCount;

      return {
        from: mock(() => ({
          as: mock(() => ({ id: "manager_id", name: "manager_name" })),
          where: mock(() => ({
            limit: mock(() => {
              // First call: check if user exists
              if (currentCall === 1) {
                return Promise.resolve([
                  {
                    id: existingUser.id,
                    email: existingUser.email,
                    sapNo: existingUser.sapNo,
                  },
                ]);
              }
              // Second call: SAP uniqueness check - return existing user (duplicate)
              // This is called when sapNo is being changed
              return Promise.resolve([{ id: "other-user-id" }]);
            }),
          })),
        })),
      };
    }),
  };

  return mockDb;
}

/**
 * Feature: user-management, Property 3: Email and SAP number uniqueness (update)
 *
 * **Validates: Requirements 2.2, 2.3**
 *
 * For any user update operation, if the email or SAP number already exists
 * for a different user, the operation SHALL be rejected with a CONFLICT error.
 */
describe("Feature: user-management, Property 3: Email and SAP number uniqueness (update)", () => {
  it("should reject update when email already exists for another user", async () => {
    await fc.assert(
      fc.asyncProperty(
        createUserInputArb,
        validEmailArb,
        async (originalInput, newEmail) => {
          // Skip if new email is the same as original
          if (newEmail === originalInput.email) {
            return;
          }

          const existingUser = {
            id: "existing-user-id",
            email: originalInput.email,
            sapNo: originalInput.sapNo,
          };

          const mockDb = createMockDbWithDuplicateEmailOnUpdate(existingUser);
          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          // Property: Update should be rejected with CONFLICT error
          try {
            await service.update({ id: existingUser.id, email: newEmail });
            // Should not reach here
            expect(true).toBe(false);
          } catch (error) {
            expect(error).toBeInstanceOf(AppError);
            const appError = error as AppError;
            expect(appError.code).toBe("CONFLICT");
            expect(appError.message).toContain("email");
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it("should reject update when SAP number already exists for another user", async () => {
    await fc.assert(
      fc.asyncProperty(
        createUserInputArb,
        validSapNoArb,
        async (originalInput, newSapNo) => {
          // Skip if new SAP is the same as original
          if (newSapNo === originalInput.sapNo) {
            return;
          }

          const existingUser = {
            id: "existing-user-id",
            email: originalInput.email,
            sapNo: originalInput.sapNo,
          };

          const mockDb = createMockDbWithDuplicateSapNoOnUpdate(existingUser);
          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          // Property: Update should be rejected with CONFLICT error
          try {
            await service.update({ id: existingUser.id, sapNo: newSapNo });
            // Should not reach here
            expect(true).toBe(false);
          } catch (error) {
            expect(error).toBeInstanceOf(AppError);
            const appError = error as AppError;
            expect(appError.code).toBe("CONFLICT");
            expect(appError.message).toContain("SAP");
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it("should allow update when email is unchanged", async () => {
    await fc.assert(
      fc.asyncProperty(createUserInputArb, async (originalInput) => {
        const now = new Date();
        const existingUser = {
          id: "existing-user-id",
          name: originalInput.name,
          email: originalInput.email,
          sapNo: originalInput.sapNo,
          role: originalInput.role ?? "REQUESTER",
          status: originalInput.status ?? "ACTIVE",
          departmentId: originalInput.departmentId ?? null,
          reportsToManagerId: originalInput.reportsToManagerId ?? null,
          createdAt: now,
          updatedAt: now,
        };

        const mockDb = createMockDbForUpdate(existingUser);
        const service = createUsersService(
          mockDb as unknown as Parameters<typeof createUsersService>[0],
        );

        // Update with same email should succeed
        const result = await service.update({
          id: existingUser.id,
          email: originalInput.email,
        });

        expect(result).toBeDefined();
        expect(result.email).toBe(originalInput.email);
      }),
      { numRuns: 20 },
    );
  });

  it("should allow update when SAP number is unchanged", async () => {
    await fc.assert(
      fc.asyncProperty(createUserInputArb, async (originalInput) => {
        const now = new Date();
        const existingUser = {
          id: "existing-user-id",
          name: originalInput.name,
          email: originalInput.email,
          sapNo: originalInput.sapNo,
          role: originalInput.role ?? "REQUESTER",
          status: originalInput.status ?? "ACTIVE",
          departmentId: originalInput.departmentId ?? null,
          reportsToManagerId: originalInput.reportsToManagerId ?? null,
          createdAt: now,
          updatedAt: now,
        };

        const mockDb = createMockDbForUpdate(existingUser);
        const service = createUsersService(
          mockDb as unknown as Parameters<typeof createUsersService>[0],
        );

        // Update with same SAP number should succeed
        const result = await service.update({
          id: existingUser.id,
          sapNo: originalInput.sapNo,
        });

        expect(result).toBeDefined();
        expect(result.sapNo).toBe(originalInput.sapNo);
      }),
      { numRuns: 20 },
    );
  });
});

/**
 * Feature: user-management, Property 5: Update preserves unmodified fields
 *
 * **Validates: Requirements 2.1, 2.5, 2.6, 2.7**
 *
 * For any user update operation with a partial update (only some fields provided),
 * all fields not included in the update input SHALL remain unchanged in the database.
 */
describe("Feature: user-management, Property 5: Update preserves unmodified fields", () => {
  it("should preserve all fields when updating only name", async () => {
    await fc.assert(
      fc.asyncProperty(
        createUserInputArb,
        validNameArb,
        async (originalInput, newName) => {
          const now = new Date();
          const existingUser = {
            id: "existing-user-id",
            name: originalInput.name,
            email: originalInput.email,
            sapNo: originalInput.sapNo,
            role: originalInput.role ?? "REQUESTER",
            status: originalInput.status ?? "ACTIVE",
            departmentId: originalInput.departmentId ?? null,
            reportsToManagerId: originalInput.reportsToManagerId ?? null,
            createdAt: now,
            updatedAt: now,
          };

          const mockDb = createMockDbForUpdate(existingUser);
          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          const result = await service.update({
            id: existingUser.id,
            name: newName,
          });

          // Property: Only name should change, all other fields preserved
          expect(result.name).toBe(newName);
          expect(result.email).toBe(existingUser.email);
          expect(result.sapNo).toBe(existingUser.sapNo);
          expect(result.role).toBe(existingUser.role);
          expect(result.status).toBe(existingUser.status);
          expect(result.departmentId).toBe(existingUser.departmentId);
          expect(result.reportsToManagerId).toBe(
            existingUser.reportsToManagerId,
          );
        },
      ),
      { numRuns: 20 },
    );
  });

  it("should preserve all fields when updating only role", async () => {
    await fc.assert(
      fc.asyncProperty(
        createUserInputArb,
        fc.constantFrom(...VALID_ROLES),
        async (originalInput, newRole) => {
          const now = new Date();
          const existingUser = {
            id: "existing-user-id",
            name: originalInput.name,
            email: originalInput.email,
            sapNo: originalInput.sapNo,
            role: originalInput.role ?? "REQUESTER",
            status: originalInput.status ?? "ACTIVE",
            departmentId: originalInput.departmentId ?? null,
            reportsToManagerId: originalInput.reportsToManagerId ?? null,
            createdAt: now,
            updatedAt: now,
          };

          const mockDb = createMockDbForUpdate(existingUser);
          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          const result = await service.update({
            id: existingUser.id,
            role: newRole,
          });

          // Property: Only role should change, all other fields preserved (Requirement 2.5)
          expect(result.role).toBe(newRole);
          expect(result.name).toBe(existingUser.name);
          expect(result.email).toBe(existingUser.email);
          expect(result.sapNo).toBe(existingUser.sapNo);
          expect(result.status).toBe(existingUser.status);
          expect(result.departmentId).toBe(existingUser.departmentId);
          expect(result.reportsToManagerId).toBe(
            existingUser.reportsToManagerId,
          );
        },
      ),
      { numRuns: 20 },
    );
  });

  it("should preserve all fields when updating only departmentId", async () => {
    await fc.assert(
      fc.asyncProperty(
        createUserInputArb,
        fc.option(fc.uuid(), { nil: null }),
        async (originalInput, newDepartmentId) => {
          const now = new Date();
          const existingUser = {
            id: "existing-user-id",
            name: originalInput.name,
            email: originalInput.email,
            sapNo: originalInput.sapNo,
            role: originalInput.role ?? "REQUESTER",
            status: originalInput.status ?? "ACTIVE",
            departmentId: originalInput.departmentId ?? null,
            reportsToManagerId: originalInput.reportsToManagerId ?? null,
            createdAt: now,
            updatedAt: now,
          };

          const mockDb = createMockDbForUpdate(existingUser);
          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          const result = await service.update({
            id: existingUser.id,
            departmentId: newDepartmentId,
          });

          // Property: Only departmentId should change, all other fields preserved (Requirement 2.6)
          expect(result.departmentId).toBe(newDepartmentId);
          expect(result.name).toBe(existingUser.name);
          expect(result.email).toBe(existingUser.email);
          expect(result.sapNo).toBe(existingUser.sapNo);
          expect(result.role).toBe(existingUser.role);
          expect(result.status).toBe(existingUser.status);
          expect(result.reportsToManagerId).toBe(
            existingUser.reportsToManagerId,
          );
        },
      ),
      { numRuns: 20 },
    );
  });

  it("should preserve all fields when updating only reportsToManagerId", async () => {
    await fc.assert(
      fc.asyncProperty(
        createUserInputArb,
        fc.option(fc.uuid(), { nil: null }),
        async (originalInput, newManagerId) => {
          const now = new Date();
          const existingUser = {
            id: "existing-user-id",
            name: originalInput.name,
            email: originalInput.email,
            sapNo: originalInput.sapNo,
            role: originalInput.role ?? "REQUESTER",
            status: originalInput.status ?? "ACTIVE",
            departmentId: originalInput.departmentId ?? null,
            reportsToManagerId: originalInput.reportsToManagerId ?? null,
            createdAt: now,
            updatedAt: now,
          };

          const mockDb = createMockDbForUpdate(existingUser);
          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          const result = await service.update({
            id: existingUser.id,
            reportsToManagerId: newManagerId,
          });

          // Property: Only reportsToManagerId should change, all other fields preserved (Requirement 2.7)
          expect(result.reportsToManagerId).toBe(newManagerId);
          expect(result.name).toBe(existingUser.name);
          expect(result.email).toBe(existingUser.email);
          expect(result.sapNo).toBe(existingUser.sapNo);
          expect(result.role).toBe(existingUser.role);
          expect(result.status).toBe(existingUser.status);
          expect(result.departmentId).toBe(existingUser.departmentId);
        },
      ),
      { numRuns: 20 },
    );
  });

  it("should preserve unmodified fields when updating multiple fields at once", async () => {
    await fc.assert(
      fc.asyncProperty(
        createUserInputArb,
        validNameArb,
        fc.constantFrom(...VALID_ROLES),
        async (originalInput, newName, newRole) => {
          const now = new Date();
          const existingUser = {
            id: "existing-user-id",
            name: originalInput.name,
            email: originalInput.email,
            sapNo: originalInput.sapNo,
            role: originalInput.role ?? "REQUESTER",
            status: originalInput.status ?? "ACTIVE",
            departmentId: originalInput.departmentId ?? null,
            reportsToManagerId: originalInput.reportsToManagerId ?? null,
            createdAt: now,
            updatedAt: now,
          };

          const mockDb = createMockDbForUpdate(existingUser);
          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          const result = await service.update({
            id: existingUser.id,
            name: newName,
            role: newRole,
          });

          // Property: Only name and role should change, all other fields preserved
          expect(result.name).toBe(newName);
          expect(result.role).toBe(newRole);
          expect(result.email).toBe(existingUser.email);
          expect(result.sapNo).toBe(existingUser.sapNo);
          expect(result.status).toBe(existingUser.status);
          expect(result.departmentId).toBe(existingUser.departmentId);
          expect(result.reportsToManagerId).toBe(
            existingUser.reportsToManagerId,
          );
        },
      ),
      { numRuns: 20 },
    );
  });

  it("should preserve createdAt timestamp on update", async () => {
    await fc.assert(
      fc.asyncProperty(
        createUserInputArb,
        validNameArb,
        async (originalInput, newName) => {
          const createdAt = new Date("2024-01-01T00:00:00Z");
          const existingUser = {
            id: "existing-user-id",
            name: originalInput.name,
            email: originalInput.email,
            sapNo: originalInput.sapNo,
            role: originalInput.role ?? "REQUESTER",
            status: originalInput.status ?? "ACTIVE",
            departmentId: originalInput.departmentId ?? null,
            reportsToManagerId: originalInput.reportsToManagerId ?? null,
            createdAt,
            updatedAt: createdAt,
          };

          const mockDb = createMockDbForUpdate(existingUser);
          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          const result = await service.update({
            id: existingUser.id,
            name: newName,
          });

          // Property: createdAt should never change on update
          expect(result.createdAt).toEqual(createdAt);
        },
      ),
      { numRuns: 20 },
    );
  });
});

// ============================================
// Deactivation Property Tests
// ============================================

/**
 * Creates a mock database for testing user deactivation.
 * Tracks user status changes and session deletions.
 */
function createMockDbForDeactivate(existingUser: {
  id: string;
  name: string;
  email: string;
  sapNo: string;
  role: string;
  status: string;
  departmentId: string | null;
  reportsToManagerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const currentUser = { ...existingUser };
  const sessions: Array<{
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  }> = [];
  let selectCallCount = 0;

  const mockDb = {
    select: mock(() => {
      selectCallCount++;

      return {
        from: mock(() => ({
          // For subquery creation (manager alias)
          as: mock(() => ({ id: "manager_id", name: "manager_name" })),
          // For regular queries
          where: mock(() => ({
            limit: mock(() => {
              // Return existing user for existence check
              return Promise.resolve([{ id: currentUser.id }]);
            }),
          })),
        })),
      };
    }),
    update: mock(() => ({
      set: mock((updateData: Record<string, unknown>) => ({
        where: mock(() => {
          // Apply the update to currentUser
          if (updateData.status !== undefined) {
            currentUser.status = updateData.status as string;
          }
          if (updateData.updatedAt !== undefined) {
            currentUser.updatedAt = updateData.updatedAt as Date;
          }
          return Promise.resolve();
        }),
      })),
    })),
    delete: mock(() => ({
      where: mock(() => {
        // Clear all sessions for the user
        sessions.length = 0;
        return Promise.resolve();
      }),
    })),
    getCurrentUser: () => currentUser,
    getSessions: () => sessions,
    addSession: (sessionData: (typeof sessions)[0]) => {
      sessions.push(sessionData);
    },
  };

  return mockDb;
}

/**
 * Creates a mock database that simulates user not found scenario.
 */
function createMockDbForDeactivateNotFound() {
  const mockDb = {
    select: mock(() => ({
      from: mock(() => ({
        as: mock(() => ({ id: "manager_id", name: "manager_name" })),
        where: mock(() => ({
          limit: mock(() => {
            // Return empty array - user not found
            return Promise.resolve([]);
          }),
        })),
      })),
    })),
  };

  return mockDb;
}

/**
 * Feature: user-management, Property 6: Deactivation status change
 *
 * **Validates: Requirements 3.1**
 *
 * For any user deactivation operation, the user's status SHALL be set to INACTIVE.
 */
describe("Feature: user-management, Property 6: Deactivation status change", () => {
  it("should set user status to INACTIVE when deactivated", async () => {
    await fc.assert(
      fc.asyncProperty(
        createUserInputArb,
        fc.constantFrom(...VALID_STATUSES),
        async (userInput, initialStatus) => {
          const now = new Date();
          const existingUser = {
            id: "user-to-deactivate",
            name: userInput.name,
            email: userInput.email,
            sapNo: userInput.sapNo,
            role: userInput.role ?? "REQUESTER",
            status: initialStatus,
            departmentId: userInput.departmentId ?? null,
            reportsToManagerId: userInput.reportsToManagerId ?? null,
            createdAt: now,
            updatedAt: now,
          };

          const mockDb = createMockDbForDeactivate(existingUser);
          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          // Deactivate the user
          await service.deactivate(existingUser.id);

          // Property: User status should be INACTIVE after deactivation
          const updatedUser = mockDb.getCurrentUser();
          expect(updatedUser.status).toBe("INACTIVE");
        },
      ),
      { numRuns: 20 },
    );
  });

  it("should set status to INACTIVE regardless of initial status", async () => {
    // Test each initial status explicitly
    for (const initialStatus of VALID_STATUSES) {
      const now = new Date();
      const existingUser = {
        id: `user-${initialStatus.toLowerCase()}`,
        name: "Test User",
        email: `test-${initialStatus.toLowerCase()}@example.com`,
        sapNo: `SAP${initialStatus}`,
        role: "REQUESTER" as const,
        status: initialStatus,
        departmentId: null,
        reportsToManagerId: null,
        createdAt: now,
        updatedAt: now,
      };

      const mockDb = createMockDbForDeactivate(existingUser);
      const service = createUsersService(
        mockDb as unknown as Parameters<typeof createUsersService>[0],
      );

      await service.deactivate(existingUser.id);

      // Property: Status should always be INACTIVE after deactivation
      const updatedUser = mockDb.getCurrentUser();
      expect(updatedUser.status).toBe("INACTIVE");
    }
  });

  it("should throw NOT_FOUND error when user does not exist", async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (nonExistentUserId) => {
        const mockDb = createMockDbForDeactivateNotFound();
        const service = createUsersService(
          mockDb as unknown as Parameters<typeof createUsersService>[0],
        );

        // Property: Deactivation should fail with NOT_FOUND for non-existent user
        try {
          await service.deactivate(nonExistentUserId);
          // Should not reach here
          expect(true).toBe(false);
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          const appError = error as AppError;
          expect(appError.code).toBe("NOT_FOUND");
        }
      }),
      { numRuns: 20 },
    );
  });

  it("should update the updatedAt timestamp on deactivation", async () => {
    await fc.assert(
      fc.asyncProperty(createUserInputArb, async (userInput) => {
        const originalDate = new Date("2024-01-01T00:00:00Z");
        const existingUser = {
          id: "user-to-deactivate",
          name: userInput.name,
          email: userInput.email,
          sapNo: userInput.sapNo,
          role: userInput.role ?? "REQUESTER",
          status: "ACTIVE" as const,
          departmentId: userInput.departmentId ?? null,
          reportsToManagerId: userInput.reportsToManagerId ?? null,
          createdAt: originalDate,
          updatedAt: originalDate,
        };

        const mockDb = createMockDbForDeactivate(existingUser);
        const service = createUsersService(
          mockDb as unknown as Parameters<typeof createUsersService>[0],
        );

        await service.deactivate(existingUser.id);

        // Property: updatedAt should be updated to a more recent time
        const updatedUser = mockDb.getCurrentUser();
        expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(
          originalDate.getTime(),
        );
      }),
      { numRuns: 20 },
    );
  });
});

/**
 * Feature: user-management, Property 7: Session cleanup on state changes (deactivate)
 *
 * **Validates: Requirements 3.2**
 *
 * For any user deactivation operation, all active sessions for that user
 * SHALL be deleted from the database.
 */
describe("Feature: user-management, Property 7: Session cleanup on state changes (deactivate)", () => {
  it("should delete all sessions when user is deactivated", async () => {
    await fc.assert(
      fc.asyncProperty(
        createUserInputArb,
        fc.integer({ min: 1, max: 10 }),
        async (userInput, sessionCount) => {
          const now = new Date();
          const existingUser = {
            id: "user-with-sessions",
            name: userInput.name,
            email: userInput.email,
            sapNo: userInput.sapNo,
            role: userInput.role ?? "REQUESTER",
            status: "ACTIVE" as const,
            departmentId: userInput.departmentId ?? null,
            reportsToManagerId: userInput.reportsToManagerId ?? null,
            createdAt: now,
            updatedAt: now,
          };

          const mockDb = createMockDbForDeactivate(existingUser);

          // Add multiple sessions for the user
          for (let i = 0; i < sessionCount; i++) {
            mockDb.addSession({
              id: `session-${i}`,
              userId: existingUser.id,
              token: `token-${i}`,
              expiresAt: new Date(now.getTime() + 86_400_000), // 24 hours from now
              createdAt: now,
              updatedAt: now,
              ipAddress: `192.168.1.${i}`,
              userAgent: `TestBrowser/${i}`,
            });
          }

          // Verify sessions exist before deactivation
          expect(mockDb.getSessions().length).toBe(sessionCount);

          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          // Deactivate the user
          await service.deactivate(existingUser.id);

          // Property: All sessions should be deleted after deactivation
          expect(mockDb.getSessions().length).toBe(0);
        },
      ),
      { numRuns: 20 },
    );
  });

  it("should handle deactivation when user has no sessions", async () => {
    await fc.assert(
      fc.asyncProperty(createUserInputArb, async (userInput) => {
        const now = new Date();
        const existingUser = {
          id: "user-no-sessions",
          name: userInput.name,
          email: userInput.email,
          sapNo: userInput.sapNo,
          role: userInput.role ?? "REQUESTER",
          status: "ACTIVE" as const,
          departmentId: userInput.departmentId ?? null,
          reportsToManagerId: userInput.reportsToManagerId ?? null,
          createdAt: now,
          updatedAt: now,
        };

        const mockDb = createMockDbForDeactivate(existingUser);

        // Verify no sessions exist
        expect(mockDb.getSessions().length).toBe(0);

        const service = createUsersService(
          mockDb as unknown as Parameters<typeof createUsersService>[0],
        );

        // Deactivation should succeed even with no sessions
        await service.deactivate(existingUser.id);

        // Property: Status should still be INACTIVE
        const updatedUser = mockDb.getCurrentUser();
        expect(updatedUser.status).toBe("INACTIVE");

        // Property: Sessions array should still be empty
        expect(mockDb.getSessions().length).toBe(0);
      }),
      { numRuns: 20 },
    );
  });

  it("should delete sessions with various expiration states", async () => {
    await fc.assert(
      fc.asyncProperty(createUserInputArb, async (userInput) => {
        const now = new Date();
        const existingUser = {
          id: "user-mixed-sessions",
          name: userInput.name,
          email: userInput.email,
          sapNo: userInput.sapNo,
          role: userInput.role ?? "REQUESTER",
          status: "ACTIVE" as const,
          departmentId: userInput.departmentId ?? null,
          reportsToManagerId: userInput.reportsToManagerId ?? null,
          createdAt: now,
          updatedAt: now,
        };

        const mockDb = createMockDbForDeactivate(existingUser);

        // Add sessions with different expiration states
        // Active session (expires in future)
        mockDb.addSession({
          id: "active-session",
          userId: existingUser.id,
          token: "active-token",
          expiresAt: new Date(now.getTime() + 86_400_000), // 24 hours from now
          createdAt: now,
          updatedAt: now,
          ipAddress: "192.168.1.1",
          userAgent: "ActiveBrowser/1.0",
        });

        // Session about to expire
        mockDb.addSession({
          id: "expiring-session",
          userId: existingUser.id,
          token: "expiring-token",
          expiresAt: new Date(now.getTime() + 60_000), // 1 minute from now
          createdAt: now,
          updatedAt: now,
          ipAddress: "192.168.1.2",
          userAgent: "ExpiringBrowser/1.0",
        });

        // Already expired session (should still be deleted)
        mockDb.addSession({
          id: "expired-session",
          userId: existingUser.id,
          token: "expired-token",
          expiresAt: new Date(now.getTime() - 86_400_000), // 24 hours ago
          createdAt: new Date(now.getTime() - 172_800_000),
          updatedAt: new Date(now.getTime() - 172_800_000),
          ipAddress: "192.168.1.3",
          userAgent: "ExpiredBrowser/1.0",
        });

        // Verify 3 sessions exist before deactivation
        expect(mockDb.getSessions().length).toBe(3);

        const service = createUsersService(
          mockDb as unknown as Parameters<typeof createUsersService>[0],
        );

        // Deactivate the user
        await service.deactivate(existingUser.id);

        // Property: ALL sessions should be deleted regardless of expiration state
        expect(mockDb.getSessions().length).toBe(0);
      }),
      { numRuns: 20 },
    );
  });

  it("should perform both status update and session cleanup atomically", async () => {
    await fc.assert(
      fc.asyncProperty(
        createUserInputArb,
        fc.integer({ min: 1, max: 5 }),
        async (userInput, sessionCount) => {
          const now = new Date();
          const existingUser = {
            id: "user-atomic-test",
            name: userInput.name,
            email: userInput.email,
            sapNo: userInput.sapNo,
            role: userInput.role ?? "REQUESTER",
            status: "ACTIVE" as const,
            departmentId: userInput.departmentId ?? null,
            reportsToManagerId: userInput.reportsToManagerId ?? null,
            createdAt: now,
            updatedAt: now,
          };

          const mockDb = createMockDbForDeactivate(existingUser);

          // Add sessions
          for (let i = 0; i < sessionCount; i++) {
            mockDb.addSession({
              id: `session-${i}`,
              userId: existingUser.id,
              token: `token-${i}`,
              expiresAt: new Date(now.getTime() + 86_400_000),
              createdAt: now,
              updatedAt: now,
              ipAddress: `10.0.0.${i}`,
              userAgent: `Browser/${i}`,
            });
          }

          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          await service.deactivate(existingUser.id);

          // Property: Both operations should complete
          // Status should be INACTIVE
          expect(mockDb.getCurrentUser().status).toBe("INACTIVE");
          // All sessions should be deleted
          expect(mockDb.getSessions().length).toBe(0);
        },
      ),
      { numRuns: 20 },
    );
  });
});

// ============================================
// Delete User (Hard Delete) Unit Tests
// ============================================

/**
 * Creates a mock database for testing user deletion (hard delete).
 * Tracks user deletion and verifies cascade behavior.
 */
function createMockDbForDelete(existingUser: {
  id: string;
  name: string;
  email: string;
  sapNo: string;
  role: string;
  status: string;
  departmentId: string | null;
  reportsToManagerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  let userDeleted = false;
  let deletedUserId: string | null = null;

  const mockDb = {
    select: mock(() => ({
      from: mock(() => ({
        as: mock(() => ({ id: "manager_id", name: "manager_name" })),
        where: mock(() => ({
          limit: mock(() => {
            // Return existing user for existence check (if not deleted)
            if (!userDeleted) {
              return Promise.resolve([{ id: existingUser.id }]);
            }
            return Promise.resolve([]);
          }),
        })),
      })),
    })),
    delete: mock(() => ({
      where: mock(() => {
        // Mark user as deleted
        userDeleted = true;
        deletedUserId = existingUser.id;
        return Promise.resolve();
      }),
    })),
    isUserDeleted: () => userDeleted,
    getDeletedUserId: () => deletedUserId,
  };

  return mockDb;
}

/**
 * Creates a mock database that simulates user not found scenario for delete.
 */
function createMockDbForDeleteNotFound() {
  const mockDb = {
    select: mock(() => ({
      from: mock(() => ({
        as: mock(() => ({ id: "manager_id", name: "manager_name" })),
        where: mock(() => ({
          limit: mock(() => {
            // Return empty array - user not found
            return Promise.resolve([]);
          }),
        })),
      })),
    })),
  };

  return mockDb;
}

/**
 * Unit tests for delete method
 *
 * **Validates: Requirements 4.2, 4.4**
 *
 * When an Admin confirms the deletion, the system SHALL permanently remove
 * the user record and all associated sessions (via cascade).
 */
describe("delete method - hard delete user", () => {
  it("should delete user when user exists", async () => {
    const now = new Date();
    const existingUser = {
      id: "user-to-delete",
      name: "Test User",
      email: "test@example.com",
      sapNo: "SAP12345",
      role: "REQUESTER" as const,
      status: "ACTIVE" as const,
      departmentId: null,
      reportsToManagerId: null,
      createdAt: now,
      updatedAt: now,
    };

    const mockDb = createMockDbForDelete(existingUser);
    const service = createUsersService(
      mockDb as unknown as Parameters<typeof createUsersService>[0],
    );

    // Delete should succeed without throwing
    await service.delete(existingUser.id);

    // Verify user was deleted
    expect(mockDb.isUserDeleted()).toBe(true);
    expect(mockDb.getDeletedUserId()).toBe(existingUser.id);
  });

  it("should throw NOT_FOUND error when user does not exist", async () => {
    const mockDb = createMockDbForDeleteNotFound();
    const service = createUsersService(
      mockDb as unknown as Parameters<typeof createUsersService>[0],
    );

    try {
      await service.delete("non-existent-user-id");
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appError = error as AppError;
      expect(appError.code).toBe("NOT_FOUND");
      expect(appError.message).toBe("User not found");
    }
  });

  it("should delete user regardless of their status", async () => {
    for (const status of VALID_STATUSES) {
      const now = new Date();
      const existingUser = {
        id: `user-${status.toLowerCase()}`,
        name: "Test User",
        email: `test-${status.toLowerCase()}@example.com`,
        sapNo: `SAP${status}`,
        role: "REQUESTER" as const,
        status,
        departmentId: null,
        reportsToManagerId: null,
        createdAt: now,
        updatedAt: now,
      };

      const mockDb = createMockDbForDelete(existingUser);
      const service = createUsersService(
        mockDb as unknown as Parameters<typeof createUsersService>[0],
      );

      // Delete should succeed for any status
      await service.delete(existingUser.id);

      expect(mockDb.isUserDeleted()).toBe(true);
    }
  });

  it("should delete user regardless of their role", async () => {
    for (const role of VALID_ROLES) {
      const now = new Date();
      const existingUser = {
        id: `user-${role.toLowerCase()}`,
        name: "Test User",
        email: `test-${role.toLowerCase()}@example.com`,
        sapNo: `SAP${role}`,
        role,
        status: "ACTIVE" as const,
        departmentId: null,
        reportsToManagerId: null,
        createdAt: now,
        updatedAt: now,
      };

      const mockDb = createMockDbForDelete(existingUser);
      const service = createUsersService(
        mockDb as unknown as Parameters<typeof createUsersService>[0],
      );

      // Delete should succeed for any role
      await service.delete(existingUser.id);

      expect(mockDb.isUserDeleted()).toBe(true);
    }
  });

  it("should delete user with department and manager references", async () => {
    const now = new Date();
    const existingUser = {
      id: "user-with-refs",
      name: "Test User",
      email: "test@example.com",
      sapNo: "SAP12345",
      role: "REQUESTER" as const,
      status: "ACTIVE" as const,
      departmentId: "dept-123",
      reportsToManagerId: "manager-456",
      createdAt: now,
      updatedAt: now,
    };

    const mockDb = createMockDbForDelete(existingUser);
    const service = createUsersService(
      mockDb as unknown as Parameters<typeof createUsersService>[0],
    );

    // Delete should succeed even with references
    await service.delete(existingUser.id);

    expect(mockDb.isUserDeleted()).toBe(true);
  });
});

/**
 * Property test for delete method using fast-check
 *
 * **Validates: Requirements 4.2, 4.4**
 */
describe("Feature: user-management, Property 8: Hard delete cascade", () => {
  it("should delete user for any valid user input", async () => {
    await fc.assert(
      fc.asyncProperty(createUserInputArb, async (userInput) => {
        const now = new Date();
        const existingUser = {
          id: "user-to-delete",
          name: userInput.name,
          email: userInput.email,
          sapNo: userInput.sapNo,
          role: userInput.role ?? "REQUESTER",
          status: userInput.status ?? "ACTIVE",
          departmentId: userInput.departmentId ?? null,
          reportsToManagerId: userInput.reportsToManagerId ?? null,
          createdAt: now,
          updatedAt: now,
        };

        const mockDb = createMockDbForDelete(existingUser);
        const service = createUsersService(
          mockDb as unknown as Parameters<typeof createUsersService>[0],
        );

        // Property: Delete should succeed for any valid user
        await service.delete(existingUser.id);

        // Property: User should be marked as deleted
        expect(mockDb.isUserDeleted()).toBe(true);
      }),
      { numRuns: 20 },
    );
  });

  it("should throw NOT_FOUND for any non-existent user ID", async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (nonExistentUserId) => {
        const mockDb = createMockDbForDeleteNotFound();
        const service = createUsersService(
          mockDb as unknown as Parameters<typeof createUsersService>[0],
        );

        // Property: Delete should fail with NOT_FOUND for non-existent user
        try {
          await service.delete(nonExistentUserId);
          // Should not reach here
          expect(true).toBe(false);
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          const appError = error as AppError;
          expect(appError.code).toBe("NOT_FOUND");
        }
      }),
      { numRuns: 20 },
    );
  });
});

// ============================================
// Session Retrieval Property Tests
// ============================================

/**
 * Creates a mock database for testing session retrieval.
 * Tracks sessions and returns them with all required fields.
 */
function createMockDbForGetSessions(
  sessions: Array<{
    id: string;
    userId: string;
    createdAt: Date;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  }>,
) {
  const mockDb = {
    select: mock(() => ({
      from: mock(() => ({
        where: mock(() => {
          // Return sessions for the user
          return Promise.resolve(
            sessions.map((s) => ({
              id: s.id,
              createdAt: s.createdAt,
              expiresAt: s.expiresAt,
              ipAddress: s.ipAddress,
              userAgent: s.userAgent,
            })),
          );
        }),
      })),
    })),
    getSessions: () => sessions,
  };

  return mockDb;
}

// Arbitrary for generating valid session data
const sessionArb = fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  createdAt: fc.date({ min: new Date("2020-01-01"), max: new Date() }),
  expiresAt: fc.date({ min: new Date(), max: new Date("2030-12-31") }),
  ipAddress: fc.option(
    fc
      .tuple(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
      )
      .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
    { nil: null },
  ),
  userAgent: fc.option(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9/ .-]{5,50}$/), {
    nil: null,
  }),
});

/**
 * Feature: user-management, Property 9: Session data completeness
 *
 * **Validates: Requirements 5.1, 5.3**
 *
 * For any session retrieval operation, each returned session SHALL include
 * id, createdAt, expiresAt, ipAddress, and userAgent fields.
 */
describe("Feature: user-management, Property 9: Session data completeness", () => {
  it("should return sessions with all required fields", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(sessionArb, { minLength: 1, maxLength: 10 }),
        async (userId, sessionsData) => {
          // Assign the userId to all sessions
          const sessions = sessionsData.map((s) => ({
            ...s,
            userId,
          }));

          const mockDb = createMockDbForGetSessions(sessions);
          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          const result = await service.getSessions(userId);

          // Property: Each returned session should have all required fields
          expect(result.length).toBe(sessions.length);

          for (const session of result) {
            // Property: id field must be present and be a string
            expect(session.id).toBeDefined();
            expect(typeof session.id).toBe("string");

            // Property: createdAt field must be present and be a Date
            expect(session.createdAt).toBeDefined();
            expect(session.createdAt).toBeInstanceOf(Date);

            // Property: expiresAt field must be present and be a Date
            expect(session.expiresAt).toBeDefined();
            expect(session.expiresAt).toBeInstanceOf(Date);

            // Property: ipAddress field must be present (can be null)
            expect("ipAddress" in session).toBe(true);
            expect(
              session.ipAddress === null ||
                typeof session.ipAddress === "string",
            ).toBe(true);

            // Property: userAgent field must be present (can be null)
            expect("userAgent" in session).toBe(true);
            expect(
              session.userAgent === null ||
                typeof session.userAgent === "string",
            ).toBe(true);
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it("should return empty array when user has no sessions", async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (userId) => {
        const mockDb = createMockDbForGetSessions([]);
        const service = createUsersService(
          mockDb as unknown as Parameters<typeof createUsersService>[0],
        );

        const result = await service.getSessions(userId);

        // Property: Should return empty array, not null or undefined
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
      }),
      { numRuns: 20 },
    );
  });

  it("should preserve session data integrity", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(sessionArb, { minLength: 1, maxLength: 5 }),
        async (userId, sessionsData) => {
          const sessions = sessionsData.map((s) => ({
            ...s,
            userId,
          }));

          const mockDb = createMockDbForGetSessions(sessions);
          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          const result = await service.getSessions(userId);

          // Property: Returned sessions should match input sessions
          expect(result.length).toBe(sessions.length);

          for (let i = 0; i < result.length; i++) {
            const returnedSession = result[i];
            const originalSession = sessions[i];

            if (!(returnedSession && originalSession)) {
              throw new Error("Session mismatch");
            }

            // Property: Session data should be preserved
            expect(returnedSession.id).toBe(originalSession.id);
            expect(returnedSession.createdAt).toEqual(
              originalSession.createdAt,
            );
            expect(returnedSession.expiresAt).toEqual(
              originalSession.expiresAt,
            );
            expect(returnedSession.ipAddress).toBe(originalSession.ipAddress);
            expect(returnedSession.userAgent).toBe(originalSession.userAgent);
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it("should handle sessions with null ipAddress and userAgent", async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (userId) => {
        // Create sessions with null values for optional fields
        const sessions = [
          {
            id: "session-null-fields",
            userId,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 86_400_000),
            ipAddress: null,
            userAgent: null,
          },
        ];

        const mockDb = createMockDbForGetSessions(sessions);
        const service = createUsersService(
          mockDb as unknown as Parameters<typeof createUsersService>[0],
        );

        const result = await service.getSessions(userId);

        // Property: Sessions with null optional fields should still be valid
        expect(result.length).toBe(1);
        const session = result[0];
        if (!session) {
          throw new Error("Session not found");
        }

        expect(session.id).toBe("session-null-fields");
        expect(session.ipAddress).toBeNull();
        expect(session.userAgent).toBeNull();

        // Property: Required fields should still be present
        expect(session.createdAt).toBeInstanceOf(Date);
        expect(session.expiresAt).toBeInstanceOf(Date);
      }),
      { numRuns: 20 },
    );
  });

  it("should handle sessions with various IP address formats", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.tuple(
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
        ),
        async (userId, [a, b, c, d]) => {
          const ipAddress = `${a}.${b}.${c}.${d}`;
          const sessions = [
            {
              id: "session-with-ip",
              userId,
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 86_400_000),
              ipAddress,
              userAgent: "TestBrowser/1.0",
            },
          ];

          const mockDb = createMockDbForGetSessions(sessions);
          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          const result = await service.getSessions(userId);

          // Property: IP address should be preserved exactly
          expect(result.length).toBe(1);
          const session = result[0];
          if (!session) {
            throw new Error("Session not found");
          }
          expect(session.ipAddress).toBe(ipAddress);
        },
      ),
      { numRuns: 20 },
    );
  });
});

// ============================================
// Session Revocation Property Tests
// ============================================

/**
 * Creates a mock database for testing single session revocation.
 * Tracks sessions and simulates deletion of a specific session.
 * The mock captures the session ID from the where condition by inspecting the SQL.
 */
function createMockDbForRevokeSession(
  sessions: Array<{
    id: string;
    userId: string;
    token: string;
    createdAt: Date;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  }>,
) {
  const currentSessions = [...sessions];
  let deletedSessionId: string | null = null;
  let deleteWasCalled = false;

  const mockDb = {
    select: mock(() => ({
      from: mock(() => ({
        where: mock(() => {
          // Return current sessions
          return Promise.resolve(
            currentSessions.map((s) => ({
              id: s.id,
              createdAt: s.createdAt,
              expiresAt: s.expiresAt,
              ipAddress: s.ipAddress,
              userAgent: s.userAgent,
            })),
          );
        }),
      })),
    })),
    delete: mock(() => ({
      where: mock((condition: { queryChunks?: Array<{ value?: unknown }> }) => {
        deleteWasCalled = true;

        // Extract the session ID from the Drizzle condition
        // The condition structure contains queryChunks with the value
        let sessionIdToDelete: string | null = null;

        if (condition?.queryChunks) {
          for (const chunk of condition.queryChunks) {
            if (typeof chunk?.value === "string") {
              // Check if this value matches any session ID
              const matchingSession = currentSessions.find(
                (s) => s.id === chunk.value,
              );
              if (matchingSession) {
                sessionIdToDelete = matchingSession.id;
                break;
              }
            }
          }
        }

        // If we found a session ID, delete it
        if (sessionIdToDelete) {
          deletedSessionId = sessionIdToDelete;
          const index = currentSessions.findIndex(
            (sess) => sess.id === sessionIdToDelete,
          );
          if (index !== -1) {
            currentSessions.splice(index, 1);
          }
        }

        return Promise.resolve();
      }),
    })),
    getSessions: () => currentSessions,
    getDeletedSessionId: () => deletedSessionId,
    wasDeleteCalled: () => deleteWasCalled,
  };

  return mockDb;
}

/**
 * Creates a mock database for testing bulk session revocation (all sessions for a user).
 * Tracks sessions and simulates deletion of all sessions for a specific user.
 * The mock captures the user ID from the where condition by inspecting the SQL.
 */
function createMockDbForRevokeAllSessions(
  sessions: Array<{
    id: string;
    userId: string;
    token: string;
    createdAt: Date;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  }>,
) {
  const currentSessions = [...sessions];
  let deletedUserId: string | null = null;
  let deleteWasCalled = false;

  const mockDb = {
    select: mock(() => ({
      from: mock(() => ({
        where: mock(() => {
          // Return current sessions
          return Promise.resolve(
            currentSessions.map((s) => ({
              id: s.id,
              createdAt: s.createdAt,
              expiresAt: s.expiresAt,
              ipAddress: s.ipAddress,
              userAgent: s.userAgent,
            })),
          );
        }),
      })),
    })),
    delete: mock(() => ({
      where: mock((condition: { queryChunks?: Array<{ value?: unknown }> }) => {
        deleteWasCalled = true;

        // Extract the user ID from the Drizzle condition
        // The condition structure contains queryChunks with the value
        let userIdToDelete: string | null = null;

        if (condition?.queryChunks) {
          for (const chunk of condition.queryChunks) {
            if (typeof chunk?.value === "string") {
              // Check if this value matches any user ID in sessions
              const matchingSession = currentSessions.find(
                (s) => s.userId === chunk.value,
              );
              if (matchingSession) {
                userIdToDelete = matchingSession.userId;
                break;
              }
            }
          }
        }

        // If we found a user ID, delete all their sessions
        if (userIdToDelete) {
          deletedUserId = userIdToDelete;
          // Remove all sessions for this user (iterate backwards to avoid index issues)
          for (let i = currentSessions.length - 1; i >= 0; i--) {
            if (currentSessions[i]?.userId === userIdToDelete) {
              currentSessions.splice(i, 1);
            }
          }
        }

        return Promise.resolve();
      }),
    })),
    getSessions: () => currentSessions,
    getDeletedUserId: () => deletedUserId,
    wasDeleteCalled: () => deleteWasCalled,
  };

  return mockDb;
}

// Arbitrary for generating session data for revocation tests
const sessionForRevocationArb = fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  token: fc.stringMatching(/^[a-zA-Z0-9]{32,64}$/),
  createdAt: fc.date({ min: new Date("2020-01-01"), max: new Date() }),
  expiresAt: fc.date({ min: new Date(), max: new Date("2030-12-31") }),
  ipAddress: fc.option(
    fc
      .tuple(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
      )
      .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
    { nil: null },
  ),
  userAgent: fc.option(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9/ .-]{5,50}$/), {
    nil: null,
  }),
});

/**
 * Feature: user-management, Property 10: Session revocation deletes records
 *
 * **Validates: Requirements 6.1, 6.2, 6.4**
 *
 * For any single session revocation, the specified session SHALL be deleted.
 * For any bulk session revocation, all sessions for the specified user SHALL be deleted.
 */
describe("Feature: user-management, Property 10: Session revocation deletes records", () => {
  describe("Single session revocation (revokeSession)", () => {
    it("should delete the specified session when revoking a single session", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(sessionForRevocationArb, { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          async (userId, sessionsData, targetIndex) => {
            // Assign the userId to all sessions
            const sessions = sessionsData.map((s) => ({
              ...s,
              userId,
            }));

            // Ensure targetIndex is within bounds
            const validTargetIndex = targetIndex % sessions.length;
            const targetSession = sessions[validTargetIndex];

            if (!targetSession) {
              return; // Skip if no valid target
            }

            const mockDb = createMockDbForRevokeSession(sessions);
            const service = createUsersService(
              mockDb as unknown as Parameters<typeof createUsersService>[0],
            );

            // Revoke the specific session
            await service.revokeSession(targetSession.id);

            // Property: The specified session SHALL be deleted
            const remainingSessions = mockDb.getSessions();
            const deletedSession = remainingSessions.find(
              (s) => s.id === targetSession.id,
            );
            expect(deletedSession).toBeUndefined();

            // Property: Other sessions should remain intact
            expect(remainingSessions.length).toBe(sessions.length - 1);
          },
        ),
        { numRuns: 20 },
      );
    });

    it("should delete only the specified session when multiple sessions exist", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(sessionForRevocationArb, { minLength: 2, maxLength: 5 }),
          async (userId, sessionsData) => {
            // Assign the userId to all sessions
            const sessions = sessionsData.map((s) => ({
              ...s,
              userId,
            }));

            // Target the first session for deletion
            const targetSession = sessions[0];
            if (!targetSession) {
              return;
            }

            const mockDb = createMockDbForRevokeSession(sessions);
            const service = createUsersService(
              mockDb as unknown as Parameters<typeof createUsersService>[0],
            );

            // Revoke the specific session
            await service.revokeSession(targetSession.id);

            // Property: Only the specified session should be deleted
            const remainingSessions = mockDb.getSessions();
            expect(remainingSessions.length).toBe(sessions.length - 1);

            // Property: All other sessions should still exist
            for (let i = 1; i < sessions.length; i++) {
              const session = sessions[i];
              if (session) {
                const found = remainingSessions.find(
                  (s) => s.id === session.id,
                );
                expect(found).toBeDefined();
              }
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    it("should handle revoking the only session for a user", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          sessionForRevocationArb,
          async (userId, sessionData) => {
            // Create a single session for the user
            const sessions = [{ ...sessionData, userId }];

            const mockDb = createMockDbForRevokeSession(sessions);
            const service = createUsersService(
              mockDb as unknown as Parameters<typeof createUsersService>[0],
            );
            const targetSession = sessions[0];
            if (!targetSession) {
              return;
            }

            // Revoke the only session
            await service.revokeSession(targetSession.id);

            // Property: The session should be deleted
            const remainingSessions = mockDb.getSessions();
            expect(remainingSessions.length).toBe(0);
          },
        ),
        { numRuns: 20 },
      );
    });

    it("should immediately invalidate the session token (Requirement 6.4)", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          sessionForRevocationArb,
          async (userId, sessionData) => {
            const sessions = [{ ...sessionData, userId }];
            const targetSession = sessions[0];
            if (!targetSession) {
              return;
            }
            const targetSessionId = targetSession.id;

            const mockDb = createMockDbForRevokeSession(sessions);
            const service = createUsersService(
              mockDb as unknown as Parameters<typeof createUsersService>[0],
            );

            // Revoke the session
            await service.revokeSession(targetSessionId);

            // Property: After revocation, the session should not exist in the database
            // This means the token is immediately invalidated (cannot be used for auth)
            const remainingSessions = mockDb.getSessions();
            const revokedSession = remainingSessions.find(
              (s) => s.id === targetSessionId,
            );
            expect(revokedSession).toBeUndefined();
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe("Bulk session revocation (revokeAllSessions)", () => {
    it("should delete all sessions for the specified user", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(sessionForRevocationArb, { minLength: 1, maxLength: 10 }),
          async (userId, sessionsData) => {
            // Assign the userId to all sessions
            const sessions = sessionsData.map((s) => ({
              ...s,
              userId,
            }));

            const mockDb = createMockDbForRevokeAllSessions(sessions);
            const service = createUsersService(
              mockDb as unknown as Parameters<typeof createUsersService>[0],
            );

            // Revoke all sessions for the user
            await service.revokeAllSessions(userId);

            // Property: ALL sessions for the user SHALL be deleted
            const remainingSessions = mockDb.getSessions();
            const userSessions = remainingSessions.filter(
              (s) => s.userId === userId,
            );
            expect(userSessions.length).toBe(0);
          },
        ),
        { numRuns: 20 },
      );
    });

    it("should delete all sessions regardless of session count", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 1, max: 20 }),
          async (userId, sessionCount) => {
            // Generate multiple sessions for the user
            const sessions = Array.from({ length: sessionCount }, (_, i) => ({
              id: `session-${i}-${userId}`,
              userId,
              token: `token-${i}`,
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 86_400_000),
              ipAddress: `192.168.1.${i % 256}`,
              userAgent: `Browser/${i}`,
            }));

            const mockDb = createMockDbForRevokeAllSessions(sessions);
            const service = createUsersService(
              mockDb as unknown as Parameters<typeof createUsersService>[0],
            );

            // Verify sessions exist before revocation
            expect(mockDb.getSessions().length).toBe(sessionCount);

            // Revoke all sessions
            await service.revokeAllSessions(userId);

            // Property: All sessions should be deleted regardless of count
            expect(mockDb.getSessions().length).toBe(0);
          },
        ),
        { numRuns: 20 },
      );
    });

    it("should handle revoking sessions when user has no sessions", async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId) => {
          // Create mock with no sessions
          const mockDb = createMockDbForRevokeAllSessions([]);
          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          // Revoke all sessions should not throw
          await service.revokeAllSessions(userId);

          // Property: Should complete without error
          expect(mockDb.getSessions().length).toBe(0);
        }),
        { numRuns: 20 },
      );
    });

    it("should delete sessions with various expiration states", async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId) => {
          const now = new Date();

          // Create sessions with different expiration states
          const sessions = [
            // Active session (expires in future)
            {
              id: `active-${userId}`,
              userId,
              token: "active-token",
              createdAt: now,
              expiresAt: new Date(now.getTime() + 86_400_000), // 24 hours from now
              ipAddress: "192.168.1.1",
              userAgent: "ActiveBrowser/1.0",
            },
            // Session about to expire
            {
              id: `expiring-${userId}`,
              userId,
              token: "expiring-token",
              createdAt: now,
              expiresAt: new Date(now.getTime() + 60_000), // 1 minute from now
              ipAddress: "192.168.1.2",
              userAgent: "ExpiringBrowser/1.0",
            },
            // Already expired session
            {
              id: `expired-${userId}`,
              userId,
              token: "expired-token",
              createdAt: new Date(now.getTime() - 172_800_000),
              expiresAt: new Date(now.getTime() - 86_400_000), // 24 hours ago
              ipAddress: "192.168.1.3",
              userAgent: "ExpiredBrowser/1.0",
            },
          ];

          const mockDb = createMockDbForRevokeAllSessions(sessions);
          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          // Verify 3 sessions exist before revocation
          expect(mockDb.getSessions().length).toBe(3);

          // Revoke all sessions
          await service.revokeAllSessions(userId);

          // Property: ALL sessions should be deleted regardless of expiration state
          expect(mockDb.getSessions().length).toBe(0);
        }),
        { numRuns: 20 },
      );
    });

    it("should only delete sessions for the specified user when multiple users have sessions", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.array(sessionForRevocationArb, { minLength: 1, maxLength: 5 }),
          fc.array(sessionForRevocationArb, { minLength: 1, maxLength: 5 }),
          async (userId1, userId2, user1SessionsData, user2SessionsData) => {
            // Skip if user IDs are the same
            if (userId1 === userId2) {
              return;
            }

            // Create sessions for two different users
            const user1Sessions = user1SessionsData.map((s) => ({
              ...s,
              userId: userId1,
            }));
            const user2Sessions = user2SessionsData.map((s) => ({
              ...s,
              userId: userId2,
            }));
            const allSessions = [...user1Sessions, ...user2Sessions];

            const mockDb = createMockDbForRevokeAllSessions(allSessions);
            const service = createUsersService(
              mockDb as unknown as Parameters<typeof createUsersService>[0],
            );

            // Revoke all sessions for user1 only
            await service.revokeAllSessions(userId1);

            // Property: Only user1's sessions should be deleted
            const remainingSessions = mockDb.getSessions();
            const user1RemainingCount = remainingSessions.filter(
              (s) => s.userId === userId1,
            ).length;
            const user2RemainingCount = remainingSessions.filter(
              (s) => s.userId === userId2,
            ).length;

            expect(user1RemainingCount).toBe(0);
            expect(user2RemainingCount).toBe(user2Sessions.length);
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});

// ============================================
// Password Reset Property Tests
// ============================================

/**
 * Creates a mock database for testing password reset.
 * Tracks account password updates and session deletions.
 * Note: resetPassword now updates the account table, not the user table.
 */
function createMockDbForResetPassword(existingUser: {
  id: string;
  name: string;
  email: string;
  sapNo: string;
  role: string;
  status: string;
  departmentId: string | null;
  reportsToManagerId: string | null;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const currentUser = { ...existingUser };
  // Account stores the password for Better Auth
  const currentAccount = {
    id: "account-id",
    accountId: existingUser.id,
    providerId: "credential",
    userId: existingUser.id,
    password: existingUser.passwordHash,
    createdAt: existingUser.createdAt,
    updatedAt: existingUser.updatedAt,
  };
  const sessions: Array<{
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  }> = [];

  const mockDb = {
    select: mock(() => ({
      from: mock(() => ({
        where: mock(() => ({
          limit: mock(() => {
            // Return existing user for existence check
            return Promise.resolve([{ id: currentUser.id }]);
          }),
        })),
      })),
    })),
    update: mock(() => ({
      set: mock((updateData: Record<string, unknown>) => ({
        where: mock(() => {
          // Apply the update to account (password is now in account table)
          if (updateData.password !== undefined) {
            currentAccount.password = updateData.password as string;
          }
          if (updateData.updatedAt !== undefined) {
            currentAccount.updatedAt = updateData.updatedAt as Date;
          }
          return Promise.resolve();
        }),
      })),
    })),
    delete: mock(() => ({
      where: mock(() => {
        // Clear all sessions for the user
        sessions.length = 0;
        return Promise.resolve();
      }),
    })),
    getCurrentUser: () => currentUser,
    getCurrentAccount: () => currentAccount,
    getSessions: () => sessions,
    addSession: (sessionData: (typeof sessions)[0]) => {
      sessions.push(sessionData);
    },
  };

  return mockDb;
}

/**
 * Creates a mock database that simulates user not found scenario for password reset.
 */
function createMockDbForResetPasswordNotFound() {
  const mockDb = {
    select: mock(() => ({
      from: mock(() => ({
        where: mock(() => ({
          limit: mock(() => {
            // Return empty array - user not found
            return Promise.resolve([]);
          }),
        })),
      })),
    })),
  };

  return mockDb;
}

/**
 * Feature: user-management, Property 2: Password hashing invariant (reset)
 *
 * **Validates: Requirements 7.1**
 *
 * For any password reset operation, the stored passwordHash SHALL NOT equal
 * the plain text password, and SHALL be a valid hash that can verify the
 * original password.
 */
describe("Feature: user-management, Property 2: Password hashing invariant (reset)", () => {
  it("should hash new password and not store plain text on reset", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        validPasswordArb,
        validPasswordArb,
        async (userId, originalPassword, newPassword) => {
          const now = new Date();
          const existingUser = {
            id: userId,
            name: "Test User",
            email: "test@example.com",
            sapNo: "SAP12345",
            role: "REQUESTER",
            status: "ACTIVE",
            departmentId: null,
            reportsToManagerId: null,
            passwordHash: `original-hash-${originalPassword}`,
            createdAt: now,
            updatedAt: now,
          };

          const mockDb = createMockDbForResetPassword(existingUser);
          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          await service.resetPassword(userId, newPassword);

          // Get the updated account to check the password hash
          const updatedAccount = mockDb.getCurrentAccount();

          // Property: password is NOT equal to plain text password
          expect(updatedAccount.password).not.toBe(newPassword);

          // Property: password is a non-empty string (valid hash format)
          expect(typeof updatedAccount.password).toBe("string");
          expect(updatedAccount.password.length).toBeGreaterThan(0);

          // Property: password should be different from original
          expect(updatedAccount.password).not.toBe(existingUser.passwordHash);
        },
      ),
      { numRuns: 5 },
    );
  });

  it("should produce a hash that can verify the new password", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        validPasswordArb,
        async (userId, newPassword) => {
          const now = new Date();
          const existingUser = {
            id: userId,
            name: "Test User",
            email: "test@example.com",
            sapNo: "SAP12345",
            role: "REQUESTER",
            status: "ACTIVE",
            departmentId: null,
            reportsToManagerId: null,
            passwordHash: "original-hash",
            createdAt: now,
            updatedAt: now,
          };

          const mockDb = createMockDbForResetPassword(existingUser);
          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          await service.resetPassword(userId, newPassword);

          const updatedAccount = mockDb.getCurrentAccount();

          // Property: The hash can verify the new password
          const isValid = await verifyPassword({
            password: newPassword,
            hash: updatedAccount.password,
          });
          expect(isValid).toBe(true);
        },
      ),
      { numRuns: 5 },
    );
  });

  it("should produce a hash that rejects incorrect passwords after reset", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        validPasswordArb,
        validPasswordArb.filter((p) => p.length >= 8),
        async (userId, newPassword, wrongPassword) => {
          // Skip if wrong password happens to match
          if (wrongPassword === newPassword) {
            return;
          }

          const now = new Date();
          const existingUser = {
            id: userId,
            name: "Test User",
            email: "test@example.com",
            sapNo: "SAP12345",
            role: "REQUESTER",
            status: "ACTIVE",
            departmentId: null,
            reportsToManagerId: null,
            passwordHash: "original-hash",
            createdAt: now,
            updatedAt: now,
          };

          const mockDb = createMockDbForResetPassword(existingUser);
          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          await service.resetPassword(userId, newPassword);

          const updatedAccount = mockDb.getCurrentAccount();

          // Property: The hash rejects incorrect passwords
          const isValid = await verifyPassword({
            password: wrongPassword,
            hash: updatedAccount.password,
          });
          expect(isValid).toBe(false);
        },
      ),
      { numRuns: 5 },
    );
  });

  it("should throw NOT_FOUND error when user does not exist", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        validPasswordArb,
        async (nonExistentUserId, newPassword) => {
          const mockDb = createMockDbForResetPasswordNotFound();
          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          // Property: Reset should fail with NOT_FOUND for non-existent user
          try {
            await service.resetPassword(nonExistentUserId, newPassword);
            // Should not reach here
            expect(true).toBe(false);
          } catch (error) {
            expect(error).toBeInstanceOf(AppError);
            const appError = error as AppError;
            expect(appError.code).toBe("NOT_FOUND");
          }
        },
      ),
      { numRuns: 5 },
    );
  });
});

/**
 * Feature: user-management, Property 7: Session cleanup on state changes (reset)
 *
 * **Validates: Requirements 7.2**
 *
 * For any password reset operation, all active sessions for that user
 * SHALL be deleted from the database.
 */
describe("Feature: user-management, Property 7: Session cleanup on state changes (reset)", () => {
  it("should delete all sessions when password is reset", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        validPasswordArb,
        fc.integer({ min: 1, max: 10 }),
        async (userId, newPassword, sessionCount) => {
          const now = new Date();
          const existingUser = {
            id: userId,
            name: "Test User",
            email: "test@example.com",
            sapNo: "SAP12345",
            role: "REQUESTER",
            status: "ACTIVE",
            departmentId: null,
            reportsToManagerId: null,
            passwordHash: "original-hash",
            createdAt: now,
            updatedAt: now,
          };

          const mockDb = createMockDbForResetPassword(existingUser);

          // Add multiple sessions for the user
          for (let i = 0; i < sessionCount; i++) {
            mockDb.addSession({
              id: `session-${i}`,
              userId,
              token: `token-${i}`,
              expiresAt: new Date(now.getTime() + 86_400_000), // 24 hours from now
              createdAt: now,
              updatedAt: now,
              ipAddress: `192.168.1.${i}`,
              userAgent: `TestBrowser/${i}`,
            });
          }

          // Verify sessions exist before reset
          expect(mockDb.getSessions().length).toBe(sessionCount);

          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          // Reset the password
          await service.resetPassword(userId, newPassword);

          // Property: All sessions should be deleted after password reset
          expect(mockDb.getSessions().length).toBe(0);
        },
      ),
      { numRuns: 20 },
    );
  });

  it("should handle password reset when user has no sessions", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        validPasswordArb,
        async (userId, newPassword) => {
          const now = new Date();
          const existingUser = {
            id: userId,
            name: "Test User",
            email: "test@example.com",
            sapNo: "SAP12345",
            role: "REQUESTER",
            status: "ACTIVE",
            departmentId: null,
            reportsToManagerId: null,
            passwordHash: "original-hash",
            createdAt: now,
            updatedAt: now,
          };

          const mockDb = createMockDbForResetPassword(existingUser);

          // Verify no sessions exist
          expect(mockDb.getSessions().length).toBe(0);

          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          // Password reset should succeed even with no sessions
          await service.resetPassword(userId, newPassword);

          // Property: Password should still be updated (in account table)
          const updatedAccount = mockDb.getCurrentAccount();
          expect(updatedAccount.password).not.toBe("original-hash");

          // Property: Sessions array should still be empty
          expect(mockDb.getSessions().length).toBe(0);
        },
      ),
      { numRuns: 20 },
    );
  });

  it("should delete sessions with various expiration states on password reset", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        validPasswordArb,
        async (userId, newPassword) => {
          const now = new Date();
          const existingUser = {
            id: userId,
            name: "Test User",
            email: "test@example.com",
            sapNo: "SAP12345",
            role: "REQUESTER",
            status: "ACTIVE",
            departmentId: null,
            reportsToManagerId: null,
            passwordHash: "original-hash",
            createdAt: now,
            updatedAt: now,
          };

          const mockDb = createMockDbForResetPassword(existingUser);

          // Add sessions with different expiration states
          // Active session (expires in future)
          mockDb.addSession({
            id: "active-session",
            userId,
            token: "active-token",
            expiresAt: new Date(now.getTime() + 86_400_000), // 24 hours from now
            createdAt: now,
            updatedAt: now,
            ipAddress: "192.168.1.1",
            userAgent: "ActiveBrowser/1.0",
          });

          // Session about to expire
          mockDb.addSession({
            id: "expiring-session",
            userId,
            token: "expiring-token",
            expiresAt: new Date(now.getTime() + 60_000), // 1 minute from now
            createdAt: now,
            updatedAt: now,
            ipAddress: "192.168.1.2",
            userAgent: "ExpiringBrowser/1.0",
          });

          // Already expired session (should still be deleted)
          mockDb.addSession({
            id: "expired-session",
            userId,
            token: "expired-token",
            expiresAt: new Date(now.getTime() - 86_400_000), // 24 hours ago
            createdAt: new Date(now.getTime() - 172_800_000),
            updatedAt: new Date(now.getTime() - 172_800_000),
            ipAddress: "192.168.1.3",
            userAgent: "ExpiredBrowser/1.0",
          });

          // Verify 3 sessions exist before reset
          expect(mockDb.getSessions().length).toBe(3);

          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          // Reset the password
          await service.resetPassword(userId, newPassword);

          // Property: ALL sessions should be deleted regardless of expiration state
          expect(mockDb.getSessions().length).toBe(0);
        },
      ),
      { numRuns: 20 },
    );
  });

  it("should perform both password update and session cleanup atomically", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        validPasswordArb,
        fc.integer({ min: 1, max: 5 }),
        async (userId, newPassword, sessionCount) => {
          const now = new Date();
          const existingUser = {
            id: userId,
            name: "Test User",
            email: "test@example.com",
            sapNo: "SAP12345",
            role: "REQUESTER",
            status: "ACTIVE",
            departmentId: null,
            reportsToManagerId: null,
            passwordHash: "original-hash",
            createdAt: now,
            updatedAt: now,
          };

          const mockDb = createMockDbForResetPassword(existingUser);

          // Add sessions
          for (let i = 0; i < sessionCount; i++) {
            mockDb.addSession({
              id: `session-${i}`,
              userId,
              token: `token-${i}`,
              expiresAt: new Date(now.getTime() + 86_400_000),
              createdAt: now,
              updatedAt: now,
              ipAddress: `10.0.0.${i}`,
              userAgent: `Browser/${i}`,
            });
          }

          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          await service.resetPassword(userId, newPassword);

          // Property: Both operations should complete
          // Password should be updated in account table (hash changed)
          expect(mockDb.getCurrentAccount().password).not.toBe("original-hash");
          // All sessions should be deleted
          expect(mockDb.getSessions().length).toBe(0);
        },
      ),
      { numRuns: 20 },
    );
  });
});

/**
 * Feature: user-management, Property 11: Response sanitization (reset)
 *
 * **Validates: Requirements 7.4**
 *
 * For any password reset operation, the response SHALL NOT expose the new password.
 * The resetPassword method returns void, which inherently satisfies this requirement.
 */
describe("Feature: user-management, Property 11: Response sanitization (reset)", () => {
  it("should return void and not expose the new password", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        validPasswordArb,
        async (userId, newPassword) => {
          const now = new Date();
          const existingUser = {
            id: userId,
            name: "Test User",
            email: "test@example.com",
            sapNo: "SAP12345",
            role: "REQUESTER",
            status: "ACTIVE",
            departmentId: null,
            reportsToManagerId: null,
            passwordHash: "original-hash",
            createdAt: now,
            updatedAt: now,
          };

          const mockDb = createMockDbForResetPassword(existingUser);
          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          // Property: resetPassword should return void (undefined)
          const result = await service.resetPassword(userId, newPassword);

          // Property: Response should be undefined (void)
          expect(result).toBeUndefined();
        },
      ),
      { numRuns: 20 },
    );
  });

  it("should not return any user data including password or passwordHash", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        validPasswordArb,
        async (userId, newPassword) => {
          const now = new Date();
          const existingUser = {
            id: userId,
            name: "Test User",
            email: "test@example.com",
            sapNo: "SAP12345",
            role: "REQUESTER",
            status: "ACTIVE",
            departmentId: null,
            reportsToManagerId: null,
            passwordHash: "original-hash",
            createdAt: now,
            updatedAt: now,
          };

          const mockDb = createMockDbForResetPassword(existingUser);
          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          const result = await service.resetPassword(userId, newPassword);

          // Property: Result should not be an object containing sensitive data
          expect(result).toBeUndefined();

          // If result were an object, it should not contain password fields
          if (
            result !== undefined &&
            typeof result === "object" &&
            result !== null
          ) {
            expect("password" in result).toBe(false);
            expect("passwordHash" in result).toBe(false);
            expect("newPassword" in result).toBe(false);
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it("should successfully reset password without exposing any credentials in response", async () => {
    await fc.assert(
      fc.asyncProperty(
        createUserInputArb,
        validPasswordArb,
        async (userInput, newPassword) => {
          const now = new Date();
          const existingUser = {
            id: "user-to-reset",
            name: userInput.name,
            email: userInput.email,
            sapNo: userInput.sapNo,
            role: userInput.role ?? "REQUESTER",
            status: userInput.status ?? "ACTIVE",
            departmentId: userInput.departmentId ?? null,
            reportsToManagerId: userInput.reportsToManagerId ?? null,
            passwordHash: "original-hash",
            createdAt: now,
            updatedAt: now,
          };

          const mockDb = createMockDbForResetPassword(existingUser);
          const service = createUsersService(
            mockDb as unknown as Parameters<typeof createUsersService>[0],
          );

          const result = await service.resetPassword(
            existingUser.id,
            newPassword,
          );

          // Property: Response is void - success confirmation without exposing password
          expect(result).toBeUndefined();

          // Property: Password was actually updated in account table (verify internally)
          const updatedAccount = mockDb.getCurrentAccount();
          expect(updatedAccount.password).not.toBe("original-hash");
          expect(updatedAccount.password).not.toBe(newPassword);
        },
      ),
      { numRuns: 20 },
    );
  });
});
