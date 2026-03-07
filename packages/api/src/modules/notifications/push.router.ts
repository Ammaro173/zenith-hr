import { z } from "zod";
import { protectedProcedure } from "../../shared/middleware";
import { pushSubscriptionSchema } from "./push.schema";

export const pushRouter = {
  subscribe: protectedProcedure
    .input(pushSubscriptionSchema)
    .handler(async ({ input, context }) => {
      return await context.services.notifications.savePushSubscription(
        context.session.user.id,
        input,
      );
    }),
  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string().url() }))
    .handler(async ({ input, context }) => {
      return await context.services.notifications.deletePushSubscription(
        context.session.user.id,
        input.endpoint,
      );
    }),
};
