import { z } from "zod";

export const searchPositionsSchema = z.object({
  query: z.string().default(""),
  limit: z.number().min(1).max(100).default(50),
});

export type SearchPositionsInput = z.infer<typeof searchPositionsSchema>;

export interface PositionSearchResponse {
  id: string;
  code: string;
  name: string;
  departmentId: string | null;
  departmentName: string | null;
  reportsToPositionId: string | null;
  jobDescriptionId: string | null;
  jobTitle: string | null;
  assignedRole:
    | "EMPLOYEE"
    | "MANAGER"
    | "HR"
    | "FINANCE"
    | "CEO"
    | "IT"
    | "ADMIN"
    | null;
}
