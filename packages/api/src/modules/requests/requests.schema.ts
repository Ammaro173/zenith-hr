import { z } from "zod";

const positionDetailsSchema = z.object({
  title: z.string().min(1),
  department: z.string().min(1),
  description: z.string().optional(),
  location: z.string().min(1),
  startDate: z.string().optional(),
  reportingTo: z.string().optional(),
});

const budgetDetailsSchema = z.object({
  currency: z.string().min(1),
  notes: z.string().optional(),
  costCenter: z.string().optional(),
  budgetCode: z.string().optional(),
});

export const REQUEST_TYPES = [
  {
    value: "NEW_POSITION",
    label: "New Position",
    description: "Creating a completely new role in the organization.",
  },
  {
    value: "REPLACEMENT",
    label: "Replacement",
    description: "Hiring to replace an employee who has left or is leaving.",
  },
] as const;

export const CONTRACT_DURATIONS = [
  { value: "FULL_TIME", label: "Full Time" },
  { value: "TEMPORARY", label: "Temporary" },
  { value: "CONSULTANT", label: "Consultant" },
] as const;

export const createRequestSchema = z
  .object({
    requestType: z.enum(["NEW_POSITION", "REPLACEMENT"]),
    isBudgeted: z.boolean(),
    replacementForUserId: z.string().uuid().optional(),
    contractDuration: z.enum(["FULL_TIME", "TEMPORARY", "CONSULTANT"]),
    justificationText: z.string().min(1),
    salaryRangeMin: z.number().positive(),
    salaryRangeMax: z.number().positive(),
    positionDetails: positionDetailsSchema,
    budgetDetails: budgetDetailsSchema,
    approverId: z.string().uuid().optional(),
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

export const createRequestDefaults: z.infer<typeof createRequestSchema> = {
  requestType: "NEW_POSITION",
  isBudgeted: false,
  contractDuration: "FULL_TIME",
  justificationText: "",
  salaryRangeMin: 1000,
  salaryRangeMax: 2000,
  positionDetails: {
    title: "",
    department: "",
    description: "",
    location: "Doha, Qatar",
  },
  budgetDetails: {
    currency: "QAR",
    notes: "",
  },
};

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

export const transitionSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["SUBMIT", "APPROVE", "REJECT", "REQUEST_CHANGE", "HOLD"]),
  comment: z.string().optional(),
});
