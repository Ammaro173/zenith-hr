import type { z } from "zod";
import {
  submitBaseBodySchema,
  submitMemberBodySchema,
  submitStaffBodySchema,
} from "@/contracts/member/schema";

export const memberPersonalSchema = submitBaseBodySchema;

export const memberVehicleSchema = submitMemberBodySchema.pick({
  make: true,
  model: true,
  year: true,
  // vinNumber: true,
});

export const staffPersonalRequiredSchema = submitStaffBodySchema;

export type MemberPersonal = z.infer<typeof memberPersonalSchema>;
export type MemberVehicle = z.infer<typeof memberVehicleSchema>;
export type StaffPersonal = z.infer<typeof staffPersonalRequiredSchema>;
