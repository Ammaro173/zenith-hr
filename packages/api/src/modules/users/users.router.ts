import { protectedProcedure } from "../../shared/middleware";
import { searchUsersSchema } from "./users.schema";

export const usersRouter = {
  search: protectedProcedure
    .input(searchUsersSchema)
    .handler(
      async ({ input, context }) =>
        await context.services.users.search(input.query, input.limit)
    ),
};
