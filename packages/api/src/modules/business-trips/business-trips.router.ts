import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { o, protectedProcedure, requireRoles } from "../../shared/middleware";
import {
  addExpenseSchema,
  createTripSchema,
  getMyTripsSchema,
  tripActionSchema,
} from "./business-trips.schema";

const create = requireRoles([
  "EMPLOYEE",
  "MANAGER",
  "HOD_HR",
  "HOD_FINANCE",
  "ADMIN",
  "CEO",
])
  .input(createTripSchema)
  .handler(
    async ({ input, context }) =>
      await context.services.businessTrips.create(
        input,
        context.session.user.id,
      ),
  );

const getById = protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .handler(async ({ input, context }) => {
    const trip = await context.services.businessTrips.getById(input.id);
    if (!trip) {
      throw new ORPCError("NOT_FOUND");
    }
    return trip;
  });

const getMyTrips = protectedProcedure
  .input(getMyTripsSchema)
  .handler(
    async ({ input, context }) =>
      await context.services.businessTrips.getByRequester(
        context.session.user.id,
        input,
      ),
  );

const getAllRelated = protectedProcedure
  .input(getMyTripsSchema)
  .handler(
    async ({ input, context }) =>
      await context.services.businessTrips.getAllRelated(
        context.session.user.id,
        input,
      ),
  );

const getPendingApprovals = requireRoles([
  "MANAGER",
  "HOD_HR",
  "HOD_FINANCE",
  "ADMIN",
  "CEO",
]).handler(async ({ context }) =>
  context.services.businessTrips.getPendingApprovals(context.session.user.id),
);

const transition = requireRoles([
  "EMPLOYEE",
  "MANAGER",
  "HOD_HR",
  "HOD_FINANCE",
  "ADMIN",
  "CEO",
])
  .input(tripActionSchema)
  .handler(async ({ input, context }) => {
    try {
      return await context.services.businessTrips.transition(
        input,
        context.session.user.id,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === "NOT_FOUND") {
        throw new ORPCError("NOT_FOUND");
      }
      if (message === "FORBIDDEN") {
        throw new ORPCError("FORBIDDEN");
      }
      if (message === "INVALID_TRANSITION") {
        throw new ORPCError("BAD_REQUEST", {
          message: "Invalid status transition",
        });
      }
      throw error;
    }
  });

const addExpense = protectedProcedure
  .input(addExpenseSchema)
  .handler(
    async ({ input, context }) =>
      await context.services.businessTrips.addExpense(input),
  );

const getExpenses = protectedProcedure
  .input(z.object({ tripId: z.string().uuid() }))
  .handler(
    async ({ input, context }) =>
      await context.services.businessTrips.getExpenses(input.tripId),
  );

const getApprovalHistory = protectedProcedure
  .input(z.object({ tripId: z.string().uuid() }))
  .handler(
    async ({ input, context }) =>
      await context.services.businessTrips.getApprovalHistory(input.tripId),
  );

const calculateAllowance = protectedProcedure
  .input(
    z.object({
      perDiem: z.number().positive(),
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
    }),
  )
  .handler(async ({ input, context }) =>
    context.services.businessTrips.calculateAllowance(
      input.perDiem,
      input.startDate,
      input.endDate,
    ),
  );

export const businessTripsRouter = o.router({
  create,
  getById,
  getMyTrips,
  getAllRelated,
  getPendingApprovals,
  transition,
  addExpense,
  getExpenses,
  getApprovalHistory,
  calculateAllowance,
});
