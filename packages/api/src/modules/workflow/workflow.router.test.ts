import { describe, expect, it, mock } from "bun:test";
import { ORPCError } from "@orpc/server";
import { AppError } from "../../shared/errors";
import type { UserRole } from "../../shared/types";

type AnyORPCError = ORPCError<string, unknown>;

const ADD_REQUEST_NOTE_ALLOWED_ROLES: UserRole[] = [
  "MANAGER",
  "HOD",
  "HOD_HR",
  "HOD_FINANCE",
  "HOD_IT",
  "CEO",
  "ADMIN",
];

function checkRoleAccess(userRole: UserRole, allowedRoles: UserRole[]): void {
  if (!allowedRoles.includes(userRole)) {
    throw new ORPCError("FORBIDDEN");
  }
}

function createMockContext(role: UserRole, error?: unknown) {
  return {
    session: {
      user: {
        id: "actor-1",
        role,
      },
    },
    cache: {
      deletePattern: mock((_pattern: string) => Promise.resolve()),
    },
    services: {
      workflow: {
        addRequestNote: error
          ? mock((_requestId: string, _actorId: string, _comment: string) =>
              Promise.reject(error),
            )
          : mock((_requestId: string, _actorId: string, _comment: string) =>
              Promise.resolve({
                id: "note-1",
                requestId: "request-1",
                actorId: "actor-1",
                action: "HOLD",
                stepName: "Internal Note",
                comment: "A note",
                performedAt: new Date(),
              }),
            ),
      },
    },
  };
}

async function simulateAddRequestNoteCall(
  context: ReturnType<typeof createMockContext>,
): Promise<{ success: boolean; error?: AnyORPCError }> {
  try {
    checkRoleAccess(
      context.session.user.role as UserRole,
      ADD_REQUEST_NOTE_ALLOWED_ROLES,
    );

    try {
      await context.services.workflow.addRequestNote(
        "request-1",
        context.session.user.id,
        "A note",
      );

      await context.cache.deletePattern("dashboard:stats:*");

      return { success: true };
    } catch (error) {
      if (error instanceof AppError) {
        throw error.toORPCError();
      }

      if (error instanceof ORPCError) {
        throw error;
      }

      throw new ORPCError("BAD_REQUEST");
    }
  } catch (error) {
    if (error instanceof ORPCError) {
      return { success: false, error };
    }

    throw error;
  }
}

describe("workflowRouter addRequestNote", () => {
  it("returns FORBIDDEN when an allowed role is not authorized for the specific request", async () => {
    const context = createMockContext(
      "MANAGER",
      AppError.forbidden("Only HR or the active approver can add notes"),
    );

    const result = await simulateAddRequestNoteCall(context);

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(ORPCError);
    expect(result.error?.code).toBe("FORBIDDEN");
  });
});
