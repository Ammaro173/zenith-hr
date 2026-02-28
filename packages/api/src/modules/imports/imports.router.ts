import { o, requireRoles } from "../../shared/middleware";
import {
  getHistoryDetailsInputSchema,
  getHistoryInputSchema,
  importDepartmentsInputSchema,
  importUsersInputSchema,
  validateDepartmentsInputSchema,
  validateUsersInputSchema,
} from "./imports.schema";

export const importsRouter = o.router({
  importUsers: requireRoles(["ADMIN", "HOD_HR"])
    .input(importUsersInputSchema)
    .handler(async ({ input, context }) =>
      context.services.imports.importUsers(input, context.session.user.id),
    ),

  importDepartments: requireRoles(["ADMIN", "HOD_HR"])
    .input(importDepartmentsInputSchema)
    .handler(async ({ input, context }) =>
      context.services.imports.importDepartments(
        input,
        context.session.user.id,
      ),
    ),

  // New endpoints
  validateUsers: requireRoles(["ADMIN", "HOD_HR"])
    .input(validateUsersInputSchema)
    .handler(async ({ input, context }) =>
      context.services.imports.validateUserRows(input.rows, input.upsertMode),
    ),

  validateDepartments: requireRoles(["ADMIN", "HOD_HR"])
    .input(validateDepartmentsInputSchema)
    .handler(async ({ input, context }) =>
      context.services.imports.validateDepartmentRows(
        input.rows,
        input.upsertMode,
      ),
    ),

  getHistory: requireRoles(["ADMIN", "HOD_HR"])
    .input(getHistoryInputSchema)
    .handler(async ({ input, context }) =>
      context.services.imports.getImportHistory(input),
    ),

  getHistoryDetails: requireRoles(["ADMIN", "HOD_HR"])
    .input(getHistoryDetailsInputSchema)
    .handler(async ({ input, context }) =>
      context.services.imports.getImportHistoryDetails(input.id),
    ),
});
