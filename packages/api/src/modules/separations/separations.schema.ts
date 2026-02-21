import { z } from "zod";

const baseSeparationSchema = z.object({
  type: z.enum(["RESIGNATION", "TERMINATION", "RETIREMENT", "END_OF_CONTRACT"]),
  reason: z.string().min(5),
  lastWorkingDay: z.date(),
  noticePeriodWaived: z.boolean(),
});

export const createSeparationSchema = baseSeparationSchema;

export const createSeparationDefaults: z.infer<typeof createSeparationSchema> =
  {
    type: "RESIGNATION",
    reason: "",
    lastWorkingDay: new Date(),
    noticePeriodWaived: false,
  };

export const updateSeparationSchema = z.object({
  separationId: z.string().uuid(),
  status: z
    .enum([
      "REQUESTED",
      "PENDING_MANAGER",
      "PENDING_HR",
      "CLEARANCE_IN_PROGRESS",
      "COMPLETED",
      "REJECTED",
      "CANCELLED",
    ])
    .optional(),
  reason: z.string().min(5).optional(),
  lastWorkingDay: z.date().optional(),
  noticePeriodWaived: z.boolean().optional(),
});

export const startClearanceSchema = z.object({
  separationId: z.string().uuid(),
});

export const updateChecklistSchema = z.object({
  checklistId: z.string().uuid(),
  status: z.enum(["PENDING", "CLEARED", "REJECTED"]),
  remarks: z.string().optional(),
});

export const approveByManagerSchema = z.object({
  separationId: z.string().uuid(),
  comment: z.string().optional(),
});

export const approveByHrSchema = z.object({
  separationId: z.string().uuid(),
  comment: z.string().optional(),
});

export const addChecklistItemSchema = z.object({
  separationId: z.string().uuid(),
  lane: z.enum([
    "OPERATIONS",
    "IT",
    "FINANCE",
    "ADMIN_ASSETS",
    "INSURANCE",
    "USED_CARS",
    "HR_PAYROLL",
  ]),
  title: z.string().min(2),
  description: z.string().optional(),
  required: z.boolean().default(true),
  dueAt: z.date().optional(),
});

export const reorderChecklistItemsSchema = z.object({
  separationId: z.string().uuid(),
  lane: z.enum([
    "OPERATIONS",
    "IT",
    "FINANCE",
    "ADMIN_ASSETS",
    "INSURANCE",
    "USED_CARS",
    "HR_PAYROLL",
  ]),
  orderedIds: z.array(z.string().uuid()).min(1),
});

export const uploadSeparationDocumentSchema = z.object({
  separationId: z.string().uuid(),
  kind: z.enum([
    "RESIGNATION_LETTER",
    "CLEARANCE_FORM",
    "EXIT_INTERVIEW",
    "SETTLEMENT_APPROVAL",
    "VISA_DOCUMENT",
    "OTHER",
  ]),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  fileBase64: z.string().min(1),
});

export const getSeparationDocumentDownloadUrlSchema = z.object({
  documentId: z.string().uuid(),
});
