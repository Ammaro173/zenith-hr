import { z } from "zod";

export const importUsersSchema = z.object({
  users: z.array(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1),
      email: z.string().email(),
      sapNo: z.string().min(1),
      role: z.enum([
        "REQUESTER",
        "MANAGER",
        "HR",
        "FINANCE",
        "CEO",
        "IT",
        "ADMIN",
      ]),
      departmentId: z.string().uuid().optional(),
    })
  ),
});
