import { z } from "zod";

/**
 * Search job descriptions by title
 */
export const searchJobDescriptionsSchema = z.object({
  search: z.string().optional(),
  limit: z.number().min(1).max(50).default(10),
});

export type SearchJobDescriptionsInput = z.infer<
  typeof searchJobDescriptionsSchema
>;

/**
 * Create a new job description
 */
export const createJobDescriptionSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().min(1, "Description is required"),
  responsibilities: z.string().optional(),
});

export type CreateJobDescriptionInput = z.infer<
  typeof createJobDescriptionSchema
>;

/**
 * Get job description by ID
 */
export const getJobDescriptionByIdSchema = z.object({
  id: z.string().uuid(),
});

export type GetJobDescriptionByIdInput = z.infer<
  typeof getJobDescriptionByIdSchema
>;

/**
 * Update job description
 */
export const updateJobDescriptionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().min(1, "Description is required"),
  responsibilities: z.string().optional(),
});

export type UpdateJobDescriptionInput = z.infer<
  typeof updateJobDescriptionSchema
>;

/**
 * Delete job description
 */
export const deleteJobDescriptionSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteJobDescriptionInput = z.infer<
  typeof deleteJobDescriptionSchema
>;

/**
 * Job description response type
 */
export interface JobDescriptionResponse {
  id: string;
  title: string;
  description: string;
  responsibilities: string | null;
  createdAt: Date;
  updatedAt: Date;
}
