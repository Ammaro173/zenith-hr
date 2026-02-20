import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { userRoleEnum } from "./auth";
import { department } from "./departments";

/**
 * Job Descriptions table - reusable role templates with title, description, and responsibilities
 */
export const jobDescription = pgTable("job_description", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  responsibilities: text("responsibilities"),
  departmentId: uuid("department_id").references(() => department.id, {
    onDelete: "set null",
  }),
  reportsToPositionId: uuid("reports_to_position_id"),
  assignedRole: userRoleEnum("assigned_role").notNull().default("EMPLOYEE"),
  grade: text("grade"),
  minSalary: integer("min_salary"),
  maxSalary: integer("max_salary"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
