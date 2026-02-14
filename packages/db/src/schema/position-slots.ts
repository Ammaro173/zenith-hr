import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { department } from "./departments";

export const positionSlot = pgTable(
  "position_slot",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    departmentId: uuid("department_id").references(() => department.id, {
      onDelete: "set null",
    }),
    isDepartmentHead: boolean("is_department_head").notNull().default(false),
    isWorkflowStageOwner: boolean("is_workflow_stage_owner")
      .notNull()
      .default(false),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    codeIdx: index("position_slot_code_idx").on(table.code),
    departmentIdx: index("position_slot_department_idx").on(table.departmentId),
  }),
);

export const slotAssignment = pgTable(
  "slot_assignment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slotId: uuid("slot_id")
      .notNull()
      .references(() => positionSlot.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at").notNull().defaultNow(),
    endsAt: timestamp("ends_at"),
    isPrimary: boolean("is_primary").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    slotIdx: index("slot_assignment_slot_idx").on(table.slotId),
    userIdx: index("slot_assignment_user_idx").on(table.userId),
    activeRangeIdx: index("slot_assignment_active_range_idx").on(table.endsAt),
  }),
);

export const slotReportingLine = pgTable(
  "slot_reporting_line",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    childSlotId: uuid("child_slot_id")
      .notNull()
      .references(() => positionSlot.id, { onDelete: "cascade" }),
    parentSlotId: uuid("parent_slot_id")
      .notNull()
      .references(() => positionSlot.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    childSlotIdx: index("slot_reporting_line_child_idx").on(table.childSlotId),
    parentSlotIdx: index("slot_reporting_line_parent_idx").on(
      table.parentSlotId,
    ),
  }),
);

export const positionSlotRelations = relations(
  positionSlot,
  ({ one, many }) => ({
    department: one(department, {
      fields: [positionSlot.departmentId],
      references: [department.id],
    }),
    assignments: many(slotAssignment),
    parentLinks: many(slotReportingLine, {
      relationName: "child_slot_links",
    }),
    childLinks: many(slotReportingLine, {
      relationName: "parent_slot_links",
    }),
  }),
);

export const slotAssignmentRelations = relations(slotAssignment, ({ one }) => ({
  slot: one(positionSlot, {
    fields: [slotAssignment.slotId],
    references: [positionSlot.id],
  }),
  user: one(user, {
    fields: [slotAssignment.userId],
    references: [user.id],
  }),
}));

export const slotReportingLineRelations = relations(
  slotReportingLine,
  ({ one }) => ({
    childSlot: one(positionSlot, {
      fields: [slotReportingLine.childSlotId],
      references: [positionSlot.id],
      relationName: "child_slot_links",
    }),
    parentSlot: one(positionSlot, {
      fields: [slotReportingLine.parentSlotId],
      references: [positionSlot.id],
      relationName: "parent_slot_links",
    }),
  }),
);
