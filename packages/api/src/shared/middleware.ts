import { ORPCError, os } from "@orpc/server";
import type { Context } from "../context";
import type { UserRole } from "./types";

export const o = os.$context<Context>();

export const publicProcedure = o;

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
    o.middleware(({ context, next }) => {
      const role = context.session?.user.role as UserRole;
      if (!(role && roles.includes(role))) {
        throw new ORPCError("FORBIDDEN");
      }

      //TODO i dont like the as types override here
      return next({
        context: {
          ...(context as Context),
          session: context.session as NonNullable<Context["session"]>,
        },
      });
    }),
  );
