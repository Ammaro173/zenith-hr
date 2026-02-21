import { z } from "zod";

const positionDetailsSchema = z.object({
  title: z.string().optional(),
  department: z.string().optional(),
  description: z.string().optional(),
  location: z.string().min(1),
  startDate: z.string().optional(),
  reportingTo: z.string().optional(),
});

const budgetDetailsSchema = z.object({
  currency: z.string().min(1),
  notes: z.string().optional(),
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

export const EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "FREELANCER", label: "Freelancer" },
  { value: "FIXED_TERM_CONTRACT", label: "Fixed-term Contract" },
  { value: "TEMPORARY", label: "Temporary" },
] as const;

// Base schema without refinements (needed for .partial() in Zod v4)
const baseRequestSchema = z.object({
  requestType: z.enum(["NEW_POSITION", "REPLACEMENT"]),
  replacementForUserId: z.string().min(1).optional(),
  contractDuration: z.enum(["FULL_TIME", "TEMPORARY", "CONSULTANT"]),
  employmentType: z.enum([
    "FULL_TIME",
    "PART_TIME",
    "FREELANCER",
    "FIXED_TERM_CONTRACT",
    "TEMPORARY",
  ]),
  headcount: z.number().int().positive(),
  jobDescriptionId: z.string().uuid(),
  justificationText: z.string().min(1),
  salaryRangeMin: z.number().positive(),
  salaryRangeMax: z.number().positive(),
  positionDetails: positionDetailsSchema,
  budgetDetails: budgetDetailsSchema,
  approverId: z.string().min(1).optional(),
});

// Create schema with refinements
export const createRequestSchema = baseRequestSchema
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
  contractDuration: "FULL_TIME",
  employmentType: "FULL_TIME",
  headcount: 1,
  jobDescriptionId: "",
  justificationText: "",
  salaryRangeMin: 1000,
  salaryRangeMax: 2000,
  positionDetails: {
    location: "Doha, Qatar",
  },
  budgetDetails: {
    currency: "QAR",
    notes: "",
  },
};

// Update schema uses partial of the base (without refinement)
export const updateRequestSchema = baseRequestSchema.partial();

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
        "COMPLETED",
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
