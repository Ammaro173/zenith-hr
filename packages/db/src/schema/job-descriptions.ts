import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
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
  assignedRole: userRoleEnum("assigned_role").notNull().default("EMPLOYEE"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
