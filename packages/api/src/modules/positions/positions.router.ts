import { AppError } from "../../shared/errors";
import { o, requireRoles } from "../../shared/middleware";
import {
  createPositionSchema,
  deletePositionSchema,
  getPositionByIdSchema,
  searchPositionsSchema,
  updatePositionByIdSchema,
} from "./positions.schema";

const positionManageRoles: Array<
  "ADMIN" | "HOD_HR" | "CEO" | "HOD_IT" | "HOD_FINANCE" | "MANAGER"
> = ["ADMIN", "HOD_HR", "CEO", "HOD_IT", "HOD_FINANCE", "MANAGER"];

export const positionsRouter = o.router({
  search: requireRoles(positionManageRoles)
    .input(searchPositionsSchema)
    .handler(async ({ input, context }) => {
      return await context.services.positions.search(input);
    }),

  create: requireRoles(positionManageRoles)
    .input(createPositionSchema)
    .handler(async ({ input, context }) => {
      return await context.services.positions.create(input);
    }),

  getById: requireRoles(positionManageRoles)
    .input(getPositionByIdSchema)
    .handler(async ({ input, context }) => {
      const result = await context.services.positions.getById(input.id);
      if (!result) {
        throw AppError.notFound("Position not found");
      }
      return result;
    }),

  update: requireRoles(positionManageRoles)
    .input(updatePositionByIdSchema)
    .handler(async ({ input, context }) => {
      const result = await context.services.positions.update(
        input.id,
        input.data,
      );
      if (!result) {
        throw AppError.notFound("Position not found");
      }
      return result;
    }),

  delete: requireRoles(positionManageRoles)
    .input(deletePositionSchema)
    .handler(async ({ input, context }) => {
      const ok = await context.services.positions.delete(input.id);
      if (!ok) {
        throw AppError.notFound("Position not found");
      }
      return { success: true };
    }),
});
