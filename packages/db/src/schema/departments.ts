import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const department = pgTable("department", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  costCenterCode: text("cost_center_code").notNull(),
  headOfDepartmentId: text("head_of_department_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
