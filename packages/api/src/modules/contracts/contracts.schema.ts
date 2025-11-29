import { z } from "zod";

export const generateContractSchema = z.object({
  requestId: z.string().uuid(),
  candidateName: z.string().min(1),
  candidateEmail: z.string().email(),
  candidateAddress: z.string().optional(),
  startDate: z.string(),
});

export const updateContractSchema = z.object({
  id: z.string().uuid(),
  candidateName: z.string().min(1).optional(),
  candidateEmail: z.string().email().optional(),
  candidateAddress: z.string().optional(),
});

export const contractIdSchema = z.object({
  id: z.string().uuid(),
});
