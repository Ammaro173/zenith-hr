import { z } from "zod";

// Base position details schema
const positionDetailsSchema = z.object({
  title: z.string().min(1),
  department: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional().default("Doha, Qatar"),
  startDate: z.string().optional(),
  reportingTo: z.string().optional(),
});

const budgetDetailsSchema = z.object({
  currency: z.string().min(1).default("QAR"),
  notes: z.string().optional(),
  costCenter: z.string().optional(),
  budgetCode: z.string().optional(),
});

export const createRequestSchema = z
  .object({
    requestType: z.enum(["NEW_POSITION", "REPLACEMENT"]),
    isBudgeted: z.boolean().default(false),
    replacementForUserId: z.string().uuid().optional(),
    contractDuration: z.enum(["FULL_TIME", "TEMPORARY", "CONSULTANT"]),
    justificationText: z.string().min(1),
    salaryRangeMin: z.number().positive(),
    salaryRangeMax: z.number().positive(),
    positionDetails: positionDetailsSchema,
    budgetDetails: budgetDetailsSchema,
  })
  .refine(
    (data) =>
      data.requestType === "NEW_POSITION" ||
      (!!data.replacementForUserId && data.requestType === "REPLACEMENT"),
    {
      message: "replacementForUserId is required for replacement requests",
      path: ["replacementForUserId"],
    },
  )
  .refine((data) => data.salaryRangeMin <= data.salaryRangeMax, {
    message: "salaryRangeMin cannot exceed salaryRangeMax",
    path: ["salaryRangeMin"],
  });

export const updateRequestSchema = createRequestSchema.partial();

export const getMyRequestsSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z
    .array(
      z.enum([
        "DRAFT",
        "PENDING_MANAGER",
        "PENDING_HR",
        "PENDING_FINANCE",
        "PENDING_CEO",
        "APPROVED_OPEN",
        "HIRING_IN_PROGRESS",
        "REJECTED",
        "ARCHIVED",
      ]),
    )
    .optional(),
  requestType: z.array(z.enum(["NEW_POSITION", "REPLACEMENT"])).optional(),
  sortBy: z
    .enum([
      "createdAt",
      "requestCode",
      "status",
      "title",
      "department",
      "requestType",
    ])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type GetMyRequestsInput = z.infer<typeof getMyRequestsSchema>;

// Transition schema
export const transitionSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["SUBMIT", "APPROVE", "REJECT", "REQUEST_CHANGE", "HOLD"]),
  comment: z.string().optional(),
});
