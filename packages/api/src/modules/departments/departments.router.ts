import { o, requireRoles } from "../../shared/middleware";
import {
  createDepartmentSchema,
  deleteDepartmentSchema,
  getDepartmentByIdSchema,
  listDepartmentsSchema,
  updateDepartmentSchema,
} from "./departments.schema";

export const departmentsRouter = o.router({
  // List departments with pagination and filtering (ADMIN, HR only)
  list: requireRoles(["ADMIN", "HOD_HR"])
    .input(listDepartmentsSchema)
    .handler(async ({ input, context }) => {
      return await context.services.departments.list(input);
    }),

  // Get all departments for dropdown (ADMIN, HR, and other roles that need department selection)
  getAll: requireRoles([
    "ADMIN",
    "HOD_HR",
    "CEO",
    "HOD_IT",
    "HOD_FINANCE",
    "MANAGER",
  ]).handler(async ({ context }) => {
    return await context.services.departments.getAll();
  }),

  // Get department by ID (ADMIN, HR only)
  getById: requireRoles(["ADMIN", "HOD_HR"])
    .input(getDepartmentByIdSchema)
    .handler(async ({ input, context }) => {
      return await context.services.departments.getById(input.id);
    }),

  // Create department (ADMIN, HR only)
  create: requireRoles(["ADMIN", "HOD_HR"])
    .input(createDepartmentSchema)
    .handler(async ({ input, context }) => {
      return await context.services.departments.create(input);
    }),

  // Update department (ADMIN, HR only)
  update: requireRoles(["ADMIN", "HOD_HR"])
    .input(updateDepartmentSchema)
    .handler(async ({ input, context }) => {
      return await context.services.departments.update(input);
    }),

  // Delete department (ADMIN, HR only)
  delete: requireRoles(["ADMIN", "HOD_HR"])
    .input(deleteDepartmentSchema)
    .handler(async ({ input, context }) => {
      return await context.services.departments.delete(input.id);
    }),
});
