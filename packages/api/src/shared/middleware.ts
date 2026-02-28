import type { ORPCErrorCode } from "@orpc/client";
import { ORPCError, os } from "@orpc/server";
import { db } from "@zenith-hr/db";
import type { Context } from "../context";
import { AppError } from "./errors";
import type { UserRole } from "./types";
import { getActorPositionInfo } from "./utils";

export const o = os.$context<Context>();

// Global error handler middleware that converts AppError to ORPCError
const errorHandler = o.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof AppError) {
      throw new ORPCError(error.code as ORPCErrorCode, {
        message: error.message,
      });
    }
    throw error;
  }
});

export const publicProcedure = o.use(errorHandler);

const requireAuth = o.middleware(({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  const session = context.session;
  return next({
    context: {
      ...context,
      session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

export const requireRoles = (roles: UserRole[]) =>
  protectedProcedure.use(
    o.middleware(async ({ context, next }) => {
      const systemRole = context.session?.user.role as UserRole;

      if (systemRole === "ADMIN" && roles.includes("ADMIN")) {
        return next({
          context: {
            ...(context as Context),
            session: context.session as NonNullable<Context["session"]>,
          },
        });
      }

      // Live position-role check
      const posInfo = await getActorPositionInfo(
        db,
        context.session?.user.id as string,
      );
      if (posInfo && roles.includes(posInfo.positionRole as UserRole)) {
        return next({
          context: {
            ...(context as Context),
            session: context.session as NonNullable<Context["session"]>,
          },
        });
      }

      throw new ORPCError("FORBIDDEN");
    }),
  );
