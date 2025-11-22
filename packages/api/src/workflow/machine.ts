import { assign, setup } from "xstate";
import type { RequestStatus, UserRole } from "../types";

export type WorkflowEvent =
  | { type: "SUBMIT"; requesterRole: UserRole }
  | { type: "APPROVE"; approverRole: UserRole }
  | { type: "REJECT" }
  | { type: "REQUEST_CHANGE" }
  | { type: "HOLD" }
  | { type: "ARCHIVE" };

export type WorkflowContext = {
  status: RequestStatus;
  requesterRole: UserRole;
  revisionVersion: number;
};

// XState machine definition (used for type checking and future enhancements)
// For now, we use a simpler state transition logic in the service
export const workflowMachine = setup({
  types: {
    context: {} as WorkflowContext,
    events: {} as WorkflowEvent,
  },
}).createMachine({
  id: "workflow",
  initial: "DRAFT",
  context: {
    status: "DRAFT",
    requesterRole: "REQUESTER",
    revisionVersion: 0,
  },
  states: {
    DRAFT: {
      on: {
        SUBMIT: [
          {
            guard: ({ event }) =>
              event.requesterRole === "MANAGER" || event.requesterRole === "HR",
            target: "PENDING_HR",
          },
          {
            guard: ({ event }) => event.requesterRole === "REQUESTER",
            target: "PENDING_MANAGER",
          },
        ],
      },
    },
    PENDING_MANAGER: {
      on: {
        APPROVE: {
          target: "PENDING_HR",
        },
        REJECT: {
          target: "REJECTED",
        },
        REQUEST_CHANGE: {
          target: "DRAFT",
          actions: assign({
            revisionVersion: ({ context }) => context.revisionVersion + 1,
          }),
        },
      },
    },
    PENDING_HR: {
      on: {
        APPROVE: {
          target: "PENDING_FINANCE",
        },
        REJECT: {
          target: "REJECTED",
        },
        HOLD: {
          target: "PENDING_HR", // Stay in same state but log HOLD action
        },
        REQUEST_CHANGE: {
          target: "DRAFT",
          actions: assign({
            revisionVersion: ({ context }) => context.revisionVersion + 1,
          }),
        },
      },
    },
    PENDING_FINANCE: {
      on: {
        APPROVE: {
          target: "PENDING_CEO",
        },
        REJECT: {
          target: "DRAFT",
          actions: assign({
            revisionVersion: ({ context }) => context.revisionVersion + 1,
          }),
        },
        REQUEST_CHANGE: {
          target: "DRAFT",
          actions: assign({
            revisionVersion: ({ context }) => context.revisionVersion + 1,
          }),
        },
      },
    },
    PENDING_CEO: {
      on: {
        APPROVE: {
          target: "APPROVED_OPEN",
        },
        REJECT: {
          target: "REJECTED",
        },
      },
    },
    APPROVED_OPEN: {
      on: {
        SUBMIT: {
          target: "HIRING_IN_PROGRESS",
        },
      },
    },
    HIRING_IN_PROGRESS: {
      // Terminal state - contract creation happens here
    },
    REJECTED: {
      on: {
        ARCHIVE: {
          target: "ARCHIVED",
        },
      },
    },
    ARCHIVED: {
      type: "final",
    },
  },
});
