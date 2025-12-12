import { requireRoles } from "../../shared/middleware";
import { importUsersSchema } from "./imports.schema";

export const importsRouter = {
  importUsers: requireRoles(["ADMIN", "HR"])
    .input(importUsersSchema)
    .handler(async ({ input, context }) =>
      context.services.imports.importUsers(input)
    ),
};
