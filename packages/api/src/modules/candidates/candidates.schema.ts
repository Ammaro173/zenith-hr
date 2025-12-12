import { z } from "zod";

export const uploadCvSchema = z.object({
  requestId: z.string().uuid(),
  candidateName: z.string().min(1),
  candidateEmail: z.string().email(),
  cvFileBase64: z.string().min(1),
});

export const selectCandidateSchema = z.object({
  requestId: z.string().uuid(),
  candidateId: z.string(),
});

export const getCandidatesSchema = z.object({
  requestId: z.string().uuid(),
});
