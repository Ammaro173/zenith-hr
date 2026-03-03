import { z } from "zod";

export const getNotificationsSchema = z.object({
  limit: z.number().min(1).max(50).default(10),
  cursor: z.string().optional(),
});

export const markAsReadSchema = z.object({
  id: z.string().uuid(),
});

export type GetNotificationsInput = z.infer<typeof getNotificationsSchema>;
export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;
