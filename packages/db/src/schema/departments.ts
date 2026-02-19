import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const department = pgTable("department", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
