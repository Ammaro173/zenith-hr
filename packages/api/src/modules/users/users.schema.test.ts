import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import {
  createUserSchema,
  resetPasswordSchema,
  updateUserSchema,
  userRoleSchema,
  userStatusSchema,
} from "./users.schema";

// Regex for UUID validation - defined at top level for performance
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// Arbitraries for generating valid data
const validNameArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{0,254}$/);
const validPasswordArb = fc.stringMatching(/^[a-zA-Z0-9]{8,32}$/);
const validSapNoArb = fc.stringMatching(/^[a-zA-Z0-9]{1,50}$/);
// Generate standard email format that Zod will accept
const validEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{2,10}$/),
    fc.stringMatching(/^[a-z]{2,8}$/),
    fc.constantFrom("com", "org", "net", "io"),
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

// Arbitraries for generating invalid data
const invalidEmailArb = fc.oneof(
  fc.constant("notanemail"),
  fc.constant("missing@domain"),
  fc.constant("@nodomain.com"),
  fc.constant("spaces in@email.com"),
  fc.constant("double@@at.com"),
  fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes("@")),
);

const invalidUuidArb = fc.oneof(
  fc.constant("not-a-uuid"),
  fc.constant("12345"),
  fc.constant("invalid-uuid-format"),
  fc.string({ minLength: 1, maxLength: 30 }).filter((s) => !UUID_REGEX.test(s)),
);

const invalidRoleArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => !VALID_ROLES.includes(s as (typeof VALID_ROLES)[number]));

const invalidStatusArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter(
    (s) => !VALID_STATUSES.includes(s as (typeof VALID_STATUSES)[number]),
  );

/**
 * Feature: user-management, Property 12: Form validation rejects invalid input
 *
 *
 * Tests that invalid inputs are rejected by Zod schemas:
 * - Empty required fields are rejected
 * - Invalid email format is rejected
 * - Password too short is rejected
 * - Invalid role values are rejected
 * - Invalid status values are rejected
 * - Invalid UUID for departmentId is rejected
 */
describe("Feature: user-management, Property 12: Form validation rejects invalid input", () => {
  describe("createUserSchema", () => {
    it("should reject empty name", () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.constant(""),
            email: validEmailArb,
            password: validPasswordArb,
            sapNo: validSapNoArb,
          }),
          (input) => {
            const result = createUserSchema.safeParse(input);
            expect(result.success).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject invalid email format", () => {
      fc.assert(
        fc.property(
          fc.record({
            name: validNameArb,
            email: invalidEmailArb,
            password: validPasswordArb,
            sapNo: validSapNoArb,
          }),
          (input) => {
            const result = createUserSchema.safeParse(input);
            expect(result.success).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject password too short (less than 8 characters)", () => {
      fc.assert(
        fc.property(
          fc.record({
            name: validNameArb,
            email: validEmailArb,
            password: fc.string({ minLength: 1, maxLength: 7 }),
            sapNo: validSapNoArb,
          }),
          (input) => {
            const result = createUserSchema.safeParse(input);
            expect(result.success).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject empty sapNo", () => {
      fc.assert(
        fc.property(
          fc.record({
            name: validNameArb,
            email: validEmailArb,
            password: validPasswordArb,
            sapNo: fc.constant(""),
          }),
          (input) => {
            const result = createUserSchema.safeParse(input);
            expect(result.success).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject invalid role values", () => {
      fc.assert(
        fc.property(
          fc.record({
            name: validNameArb,
            email: validEmailArb,
            password: validPasswordArb,
            sapNo: validSapNoArb,
            role: invalidRoleArb,
          }),
          (input) => {
            const result = createUserSchema.safeParse(input);
            expect(result.success).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject invalid status values", () => {
      fc.assert(
        fc.property(
          fc.record({
            name: validNameArb,
            email: validEmailArb,
            password: validPasswordArb,
            sapNo: validSapNoArb,
            status: invalidStatusArb,
          }),
          (input) => {
            const result = createUserSchema.safeParse(input);
            expect(result.success).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject invalid UUID for departmentId", () => {
      fc.assert(
        fc.property(
          fc.record({
            name: validNameArb,
            email: validEmailArb,
            password: validPasswordArb,
            sapNo: validSapNoArb,
            departmentId: invalidUuidArb,
          }),
          (input) => {
            const result = createUserSchema.safeParse(input);
            expect(result.success).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should accept valid input with all required fields", () => {
      fc.assert(
        fc.property(
          fc.record({
            name: validNameArb,
            email: validEmailArb,
            password: validPasswordArb,
            sapNo: validSapNoArb,
          }),
          (input) => {
            const result = createUserSchema.safeParse(input);
            expect(result.success).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should accept valid input with optional fields", () => {
      fc.assert(
        fc.property(
          fc.record({
            name: validNameArb,
            email: validEmailArb,
            password: validPasswordArb,
            sapNo: validSapNoArb,
            role: fc.constantFrom(...VALID_ROLES),
            status: fc.constantFrom(...VALID_STATUSES),
            departmentId: fc.option(fc.uuid(), { nil: null }),
            reportsToManagerId: fc.option(fc.string({ minLength: 1 }), {
              nil: null,
            }),
          }),
          (input) => {
            const result = createUserSchema.safeParse(input);
            expect(result.success).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("updateUserSchema", () => {
    it("should reject invalid email format when provided", () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1 }),
            email: invalidEmailArb,
          }),
          (input) => {
            const result = updateUserSchema.safeParse(input);
            expect(result.success).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject empty name when provided", () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1 }),
            name: fc.constant(""),
          }),
          (input) => {
            const result = updateUserSchema.safeParse(input);
            expect(result.success).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject empty sapNo when provided", () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1 }),
            sapNo: fc.constant(""),
          }),
          (input) => {
            const result = updateUserSchema.safeParse(input);
            expect(result.success).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject invalid role values when provided", () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1 }),
            role: invalidRoleArb,
          }),
          (input) => {
            const result = updateUserSchema.safeParse(input);
            expect(result.success).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject invalid status values when provided", () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1 }),
            status: invalidStatusArb,
          }),
          (input) => {
            const result = updateUserSchema.safeParse(input);
            expect(result.success).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject invalid UUID for departmentId when provided", () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1 }),
            departmentId: invalidUuidArb,
          }),
          (input) => {
            const result = updateUserSchema.safeParse(input);
            expect(result.success).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should accept valid partial update with id only", () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1 }),
          }),
          (input) => {
            const result = updateUserSchema.safeParse(input);
            expect(result.success).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should accept valid partial update with optional fields", () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1 }),
            name: validNameArb,
            email: validEmailArb,
            role: fc.constantFrom(...VALID_ROLES),
          }),
          (input) => {
            const result = updateUserSchema.safeParse(input);
            expect(result.success).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("resetPasswordSchema", () => {
    it("should reject password too short (less than 8 characters)", () => {
      fc.assert(
        fc.property(
          fc.record({
            userId: fc.string({ minLength: 1 }),
            newPassword: fc.string({ minLength: 1, maxLength: 7 }),
          }),
          (input) => {
            const result = resetPasswordSchema.safeParse(input);
            expect(result.success).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject empty password", () => {
      fc.assert(
        fc.property(
          fc.record({
            userId: fc.string({ minLength: 1 }),
            newPassword: fc.constant(""),
          }),
          (input) => {
            const result = resetPasswordSchema.safeParse(input);
            expect(result.success).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should accept valid password (8+ characters)", () => {
      fc.assert(
        fc.property(
          fc.record({
            userId: fc.string({ minLength: 1 }),
            newPassword: validPasswordArb,
          }),
          (input) => {
            const result = resetPasswordSchema.safeParse(input);
            expect(result.success).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("userRoleSchema", () => {
    it("should reject invalid role values", () => {
      fc.assert(
        fc.property(invalidRoleArb, (role) => {
          const result = userRoleSchema.safeParse(role);
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it("should accept all valid role values", () => {
      fc.assert(
        fc.property(fc.constantFrom(...VALID_ROLES), (role) => {
          const result = userRoleSchema.safeParse(role);
          expect(result.success).toBe(true);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("userStatusSchema", () => {
    it("should reject invalid status values", () => {
      fc.assert(
        fc.property(invalidStatusArb, (status) => {
          const result = userStatusSchema.safeParse(status);
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it("should accept all valid status values", () => {
      fc.assert(
        fc.property(fc.constantFrom(...VALID_STATUSES), (status) => {
          const result = userStatusSchema.safeParse(status);
          expect(result.success).toBe(true);
        }),
        { numRuns: 100 },
      );
    });
  });
});
