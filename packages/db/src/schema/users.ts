import {
  boolean,
  integer,
  pgEnum,
  pgTableCreator,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const pgTable = pgTableCreator((name) => name);

export const userRoleEnum = pgEnum("user_role", [
  "EMPLOYEE",
  "MANAGER",
  "HOD",
  "HOD_HR",
  "HOD_FINANCE",
  "HOD_IT",
  "CEO",
  "ADMIN",
]);

export const positionRoleEnum = pgEnum("position_role", [
  "EMPLOYEE",
  "MANAGER",
  "HOD",
  "HOD_HR",
  "HOD_FINANCE",
  "HOD_IT",
  "CEO",
  "ADMIN",
]);

export const userStatusEnum = pgEnum("user_status", [
  "ACTIVE",
  "INACTIVE",
  "ON_LEAVE",
]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  role: userRoleEnum("role").notNull().default("EMPLOYEE"),
  status: userStatusEnum("status").notNull().default("ACTIVE"),
  sapNo: text("sap_no").notNull().unique(),
  // Note: No FK constraint here to avoid circular dependency with departments.
  // Referential integrity is maintained at the application level.
  departmentId: uuid("department_id"),
  passwordHash: text("password_hash"),
  signatureUrl: text("signature_url"),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});
