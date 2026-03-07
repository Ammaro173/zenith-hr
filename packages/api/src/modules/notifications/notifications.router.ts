import { protectedProcedure } from "../../shared/middleware";
import {
  getNotificationsSchema,
  markAsReadSchema,
} from "./notifications.schema";

export const notificationsRouter = {
  list: protectedProcedure
    .input(getNotificationsSchema)
    .handler(async ({ input, context }) => {
      const items = await context.services.notifications.getUserNotifications(
        context.session.user.id,
        input.limit,
        input.cursor,
      );
      const unreadCount = await context.services.notifications.getUnreadCount(
        context.session.user.id,
      );

      return {
        items,
        unreadCount,
      };
    }),

  markAsRead: protectedProcedure
    .input(markAsReadSchema)
    .handler(async ({ input, context }) => {
      return await context.services.notifications.markAsRead(
        input.id,
        context.session.user.id,
      );
    }),
};
