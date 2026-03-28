import type { createTripSchema } from "@zenith-hr/api/modules/business-trips/business-trips.schema";
import type { z } from "zod";

export type CreateTripInput = z.infer<typeof createTripSchema>;
/** Form state uses schema input so it matches validators (onChange) and defaults. */
export type FormValues = z.input<typeof createTripSchema>;
