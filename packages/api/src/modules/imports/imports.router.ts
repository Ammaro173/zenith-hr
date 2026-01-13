import { o, requireRoles } from "../../shared/middleware";
import { importDepartmentsSchema, importUsersSchema } from "./imports.schema";

export const importsRouter = o.router({
  importUsers: requireRoles(["ADMIN", "HR"])
    .input(importUsersSchema)
    .handler(async ({ input, context }) =>
      context.services.imports.importUsers(input),
    ),

  importDepartments: requireRoles(["ADMIN", "HR"])
    .input(importDepartmentsSchema)
    .handler(async ({ input, context }) =>
      context.services.imports.importDepartments(input.departments),
    ),
});
