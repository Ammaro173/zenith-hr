import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { manpowerRequest } from "./manpower-requests";

export const candidates = pgTable("candidates", {
  id: text("id").primaryKey(), // Using text ID to match existing logic (requestId_email)
  requestId: uuid("request_id")
    .notNull()
    .references(() => manpowerRequest.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  cvUrl: text("cv_url").notNull(),
  status: text("status").notNull().default("APPLIED"), // APPLIED, SELECTED, REJECTED
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
