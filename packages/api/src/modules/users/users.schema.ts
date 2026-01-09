import { z } from "zod";

export const searchUsersSchema = z.object({
  query: z.string().min(1),
  limit: z.number().optional().default(10),
});

export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
