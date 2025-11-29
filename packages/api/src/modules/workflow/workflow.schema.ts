import { z } from "zod";

export const transitionSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum([
    "SUBMIT",
    "APPROVE",
    "REJECT",
    "REQUEST_CHANGE",
    "HOLD",
    "ARCHIVE",
  ]),
  comment: z.string().optional(),
});

export const requestIdSchema = z.object({
  id: z.string().uuid(),
});
