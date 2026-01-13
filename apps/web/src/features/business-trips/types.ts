import type { createTripSchema } from "@zenith-hr/api/modules/business-trips/business-trips.schema";
import type { z } from "zod";

export type CreateTripInput = z.infer<typeof createTripSchema>;
