import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { jobPosition } from "./position-slots";

export const separationTypeEnum = pgEnum("separation_type", [
  "RESIGNATION",
  "TERMINATION",
  "RETIREMENT",
  "END_OF_CONTRACT",
]);

export const separationStatusEnum = pgEnum("separation_status", [
  "REQUESTED",
  "PENDING_MANAGER",
  "PENDING_HR",
  "CLEARANCE_IN_PROGRESS",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
]);

export const clearanceLaneEnum = pgEnum("clearance_lane", [
  "OPERATIONS",
  "IT",
  "FINANCE",
  "ADMIN_ASSETS",
  "INSURANCE",
  "USED_CARS",
  "HR_PAYROLL",
]);

export const separationChecklistStatusEnum = pgEnum(
  "separation_checklist_status",
  ["PENDING", "CLEARED", "REJECTED"],
);

export const separationChecklistSourceEnum = pgEnum(
  "separation_checklist_source",
  ["TEMPLATE", "CUSTOM"],
);

export const separationDocumentKindEnum = pgEnum("separation_document_kind", [
  "RESIGNATION_LETTER",
  "CLEARANCE_FORM",
  "EXIT_INTERVIEW",
  "SETTLEMENT_APPROVAL",
  "VISA_DOCUMENT",
  "OTHER",
]);

export const separationRequest = pgTable("separation_request", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: text("employee_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  managerId: text("manager_id").references(() => user.id, {
    onDelete: "set null",
  }),
  managerPositionId: uuid("manager_position_id").references(
    () => jobPosition.id,
    {
      onDelete: "set null",
    },
  ),
  hrOwnerId: text("hr_owner_id").references(() => user.id, {
    onDelete: "set null",
  }),
  type: separationTypeEnum("type").notNull(),
  reason: text("reason").notNull(),
  lastWorkingDay: date("last_working_day").notNull(),
  noticePeriodWaived: boolean("notice_period_waived").notNull().default(false),
  status: separationStatusEnum("status").notNull().default("REQUESTED"),
  completedAt: timestamp("completed_at"),
  // --- HR/Payroll integration fields (nullable; filled at later stages) ---
  visaAction: text("visa_action", {
    enum: ["TRANSFER", "CANCEL", "NONE"],
  }),
  visaStatus: text("visa_status", {
    enum: ["PENDING", "IN_PROGRESS", "COMPLETED"],
  }),
  eosbStatus: text("eosb_status", {
    enum: ["PENDING", "IN_PROGRESS", "COMPLETED"],
  }),
  repatriationRequired: boolean("repatriation_required"),
  finalSettlementMethod: text("final_settlement_method", {
    enum: ["BANK_TRANSFER", "CHEQUE", "CASH", "OTHER"],
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Membership table that maps users to exit-clearance lanes.
export const userClearanceLane = pgTable("user_clearance_lane", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  lane: clearanceLaneEnum("lane").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const separationChecklistTemplate = pgTable(
  "separation_checklist_template",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lane: clearanceLaneEnum("lane").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    required: boolean("required").notNull().default(true),
    defaultDueOffsetDays: integer("default_due_offset_days"),
    order: integer("order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
);

export const separationChecklist = pgTable("separation_checklist", {
  id: uuid("id").primaryKey().defaultRandom(),
  separationId: uuid("separation_id")
    .notNull()
    .references(() => separationRequest.id, { onDelete: "cascade" }),
  // Legacy column kept for backfill (old schema). Use `lane` going forward.
  department: text("department"),
  lane: clearanceLaneEnum("lane").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  required: boolean("required").notNull().default(true),
  dueAt: timestamp("due_at"),
  status: separationChecklistStatusEnum("status").notNull().default("PENDING"),
  checkedBy: text("checked_by").references(() => user.id, {
    onDelete: "set null",
  }),
  checkedAt: timestamp("checked_at"),
  verifiedBy: text("verified_by").references(() => user.id, {
    onDelete: "set null",
  }),
  verifiedAt: timestamp("verified_at"),
  remarks: text("remarks"),
  source: separationChecklistSourceEnum("source").notNull().default("TEMPLATE"),
  order: integer("order").notNull().default(0),
  // Extra metadata for integrations / UI hints.
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const separationDocument = pgTable("separation_document", {
  id: uuid("id").primaryKey().defaultRandom(),
  separationId: uuid("separation_id")
    .notNull()
    .references(() => separationRequest.id, { onDelete: "cascade" }),
  kind: separationDocumentKindEnum("kind").notNull(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull().default(0),
  storageKey: text("storage_key").notNull(),
  storageUrl: text("storage_url"),
  uploadedBy: text("uploaded_by").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const separationReminderState = pgTable("separation_reminder_state", {
  id: uuid("id").primaryKey().defaultRandom(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  separationId: uuid("separation_id")
    .notNull()
    .references(() => separationRequest.id, { onDelete: "cascade" }),
  lane: clearanceLaneEnum("lane"),
  checklistItemId: uuid("checklist_item_id").references(
    () => separationChecklist.id,
    {
      onDelete: "cascade",
    },
  ),
  reminderType: text("reminder_type").notNull(),
  lastSentAt: timestamp("last_sent_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const separationRequestRelations = relations(
  separationRequest,
  ({ one, many }) => ({
    employee: one(user, {
      fields: [separationRequest.employeeId],
      references: [user.id],
    }),
    manager: one(user, {
      fields: [separationRequest.managerId],
      references: [user.id],
      relationName: "separation_manager",
    }),
    managerPosition: one(jobPosition, {
      fields: [separationRequest.managerPositionId],
      references: [jobPosition.id],
      relationName: "separation_manager_position",
    }),
    hrOwner: one(user, {
      fields: [separationRequest.hrOwnerId],
      references: [user.id],
      relationName: "separation_hr_owner",
    }),
    checklistItems: many(separationChecklist),
    documents: many(separationDocument),
    reminderStates: many(separationReminderState),
  }),
);

export const separationChecklistRelations = relations(
  separationChecklist,
  ({ one }) => ({
    separationRequest: one(separationRequest, {
      fields: [separationChecklist.separationId],
      references: [separationRequest.id],
    }),
    checkedByUser: one(user, {
      fields: [separationChecklist.checkedBy],
      references: [user.id],
      relationName: "separation_check_checked_by",
    }),
    verifiedByUser: one(user, {
      fields: [separationChecklist.verifiedBy],
      references: [user.id],
      relationName: "separation_check_verified_by",
    }),
  }),
);

export const separationDocumentRelations = relations(
  separationDocument,
  ({ one }) => ({
    separationRequest: one(separationRequest, {
      fields: [separationDocument.separationId],
      references: [separationRequest.id],
    }),
    uploadedByUser: one(user, {
      fields: [separationDocument.uploadedBy],
      references: [user.id],
    }),
  }),
);

export const userClearanceLaneRelations = relations(
  userClearanceLane,
  ({ one }) => ({
    user: one(user, {
      fields: [userClearanceLane.userId],
      references: [user.id],
    }),
  }),
);

export const separationReminderStateRelations = relations(
  separationReminderState,
  ({ one }) => ({
    separationRequest: one(separationRequest, {
      fields: [separationReminderState.separationId],
      references: [separationRequest.id],
    }),
    checklistItem: one(separationChecklist, {
      fields: [separationReminderState.checklistItemId],
      references: [separationChecklist.id],
    }),
  }),
);
