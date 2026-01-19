import { describe, expect, it, mock } from "bun:test";
import type { RequestStatus, UserRole } from "../../shared/types";
import { createWorkflowService } from "./workflow.service";

// ============================================================================
// Mock Factory
// ============================================================================

function createMockDb(
  overrides: {
    request?: Partial<{
      id: string;
      status: RequestStatus;
      requesterId: string;
      revisionVersion: number;
      positionDetails: Record<string, unknown>;
      budgetDetails: Record<string, unknown>;
    }> | null;
    actor?: Partial<{
      id: string;
      role: UserRole;
      name: string;
    }> | null;
    hrUser?: { id: string } | null;
    targetRoleUser?: { id: string } | null;
  } = {},
) {
  const defaultRequest = {
    id: "request-123",
    status: "DRAFT" as RequestStatus,
    requesterId: "user-1",
    revisionVersion: 1,
    positionDetails: {},
    budgetDetails: {},
  };

  const defaultActor = {
    id: "user-1",
    role: "REQUESTER" as UserRole,
    name: "Test User",
  };

  const request =
    overrides.request === null
      ? null
      : { ...defaultRequest, ...overrides.request };
  const actor =
    overrides.actor === null ? null : { ...defaultActor, ...overrides.actor };

  let selectCallCount = 0;

  const mockDb = {
    select: mock(() => ({
      from: mock((_table: unknown) => ({
        where: mock(() => ({
          limit: mock(() => {
            selectCallCount++;
            // First select is for request, second is for actor, third might be for next approver
            if (selectCallCount === 1) {
              return Promise.resolve(request ? [request] : []);
            }
            if (selectCallCount === 2) {
              return Promise.resolve(actor ? [actor] : []);
            }
            // For role lookups (HR, FINANCE, CEO, etc.)
            if (overrides.targetRoleUser) {
              return Promise.resolve([overrides.targetRoleUser]);
            }
            if (overrides.hrUser) {
              return Promise.resolve([overrides.hrUser]);
            }
            return Promise.resolve([{ id: "approver-1" }]);
          }),
        })),
      })),
    })),
    insert: mock(() => ({
      values: mock(() => Promise.resolve()),
    })),
    update: mock(() => ({
      set: mock(() => ({
        where: mock(() => Promise.resolve()),
      })),
    })),
    execute: mock(() => Promise.resolve({ rows: [] })),
    transaction: mock(async (cb: (tx: typeof mockDb) => Promise<unknown>) => {
      selectCallCount = 0; // Reset for each transaction
      return await cb(mockDb);
    }),
  } as any;

  return mockDb;
}

// ============================================================================
// Tests: getApproverForStatus
// ============================================================================

describe("WorkflowService", () => {
  describe("getApproverForStatus", () => {
    const mockDb = createMockDb();
    const service = createWorkflowService(mockDb);

    it("returns MANAGER for PENDING_MANAGER status", () => {
      expect(service.getApproverForStatus("PENDING_MANAGER")).toBe("MANAGER");
    });

    it("returns HR for PENDING_HR status", () => {
      expect(service.getApproverForStatus("PENDING_HR")).toBe("HR");
    });

    it("returns FINANCE for PENDING_FINANCE status", () => {
      expect(service.getApproverForStatus("PENDING_FINANCE")).toBe("FINANCE");
    });

    it("returns CEO for PENDING_CEO status", () => {
      expect(service.getApproverForStatus("PENDING_CEO")).toBe("CEO");
    });

    it("returns null for DRAFT status", () => {
      expect(service.getApproverForStatus("DRAFT")).toBeNull();
    });

    it("returns null for APPROVED_OPEN status", () => {
      expect(service.getApproverForStatus("APPROVED_OPEN")).toBeNull();
    });

    it("returns null for REJECTED status", () => {
      expect(service.getApproverForStatus("REJECTED")).toBeNull();
    });
  });

  // ============================================================================
  // Tests: shouldSkipStep
  // ============================================================================

  describe("shouldSkipStep", () => {
    const mockDb = createMockDb();
    const service = createWorkflowService(mockDb);

    it("returns true when MANAGER submits at PENDING_MANAGER", () => {
      expect(service.shouldSkipStep("MANAGER", "PENDING_MANAGER")).toBe(true);
    });

    it("returns true when HR submits at PENDING_HR", () => {
      expect(service.shouldSkipStep("HR", "PENDING_HR")).toBe(true);
    });

    it("returns false for REQUESTER at PENDING_MANAGER", () => {
      expect(service.shouldSkipStep("REQUESTER", "PENDING_MANAGER")).toBe(
        false,
      );
    });

    it("returns false for MANAGER at PENDING_HR", () => {
      expect(service.shouldSkipStep("MANAGER", "PENDING_HR")).toBe(false);
    });

    it("returns false for any role at DRAFT", () => {
      expect(service.shouldSkipStep("MANAGER", "DRAFT")).toBe(false);
      expect(service.shouldSkipStep("HR", "DRAFT")).toBe(false);
      expect(service.shouldSkipStep("REQUESTER", "DRAFT")).toBe(false);
    });
  });

  // ============================================================================
  // Tests: transitionRequest - DRAFT status
  // ============================================================================

  describe("transitionRequest - DRAFT status", () => {
    it("SUBMIT by REQUESTER → PENDING_MANAGER", async () => {
      const mockDb = createMockDb({
        request: { status: "DRAFT", requesterId: "user-1" },
        actor: { id: "user-1", role: "REQUESTER" },
      });
      const service = createWorkflowService(mockDb);

      const result = await service.transitionRequest(
        "request-123",
        "user-1",
        "SUBMIT",
      );

      expect(result.previousStatus).toBe("DRAFT");
      expect(result.newStatus).toBe("PENDING_MANAGER");
    });

    it("SUBMIT by MANAGER → PENDING_HR (skips PENDING_MANAGER)", async () => {
      const mockDb = createMockDb({
        request: { status: "DRAFT", requesterId: "manager-1" },
        actor: { id: "manager-1", role: "MANAGER" },
      });
      const service = createWorkflowService(mockDb);

      const result = await service.transitionRequest(
        "request-123",
        "manager-1",
        "SUBMIT",
      );

      expect(result.previousStatus).toBe("DRAFT");
      expect(result.newStatus).toBe("PENDING_HR");
    });

    it("SUBMIT by HR → PENDING_HR (skips PENDING_MANAGER)", async () => {
      const mockDb = createMockDb({
        request: { status: "DRAFT", requesterId: "hr-1" },
        actor: { id: "hr-1", role: "HR" },
      });
      const service = createWorkflowService(mockDb);

      const result = await service.transitionRequest(
        "request-123",
        "hr-1",
        "SUBMIT",
      );

      expect(result.previousStatus).toBe("DRAFT");
      expect(result.newStatus).toBe("PENDING_HR");
    });

    it("throws BadRequest for APPROVE action from DRAFT", async () => {
      const mockDb = createMockDb({
        request: { status: "DRAFT" },
        actor: { id: "user-1", role: "MANAGER" },
      });
      const service = createWorkflowService(mockDb);

      await expect(
        service.transitionRequest("request-123", "user-1", "APPROVE"),
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // Tests: transitionRequest - PENDING_MANAGER status
  // ============================================================================

  describe("transitionRequest - PENDING_MANAGER status", () => {
    it("APPROVE by MANAGER → PENDING_HR", async () => {
      const mockDb = createMockDb({
        request: { status: "PENDING_MANAGER" },
        actor: { id: "manager-1", role: "MANAGER" },
      });
      const service = createWorkflowService(mockDb);

      const result = await service.transitionRequest(
        "request-123",
        "manager-1",
        "APPROVE",
      );

      expect(result.previousStatus).toBe("PENDING_MANAGER");
      expect(result.newStatus).toBe("PENDING_HR");
    });

    it("REJECT by MANAGER → REJECTED", async () => {
      const mockDb = createMockDb({
        request: { status: "PENDING_MANAGER" },
        actor: { id: "manager-1", role: "MANAGER" },
      });
      const service = createWorkflowService(mockDb);

      const result = await service.transitionRequest(
        "request-123",
        "manager-1",
        "REJECT",
      );

      expect(result.previousStatus).toBe("PENDING_MANAGER");
      expect(result.newStatus).toBe("REJECTED");
    });

    it("REQUEST_CHANGE by MANAGER → DRAFT", async () => {
      const mockDb = createMockDb({
        request: { status: "PENDING_MANAGER" },
        actor: { id: "manager-1", role: "MANAGER" },
      });
      const service = createWorkflowService(mockDb);

      const result = await service.transitionRequest(
        "request-123",
        "manager-1",
        "REQUEST_CHANGE",
      );

      expect(result.previousStatus).toBe("PENDING_MANAGER");
      expect(result.newStatus).toBe("DRAFT");
    });

    it("throws FORBIDDEN when HR tries to approve PENDING_MANAGER", async () => {
      const mockDb = createMockDb({
        request: { status: "PENDING_MANAGER" },
        actor: { id: "hr-1", role: "HR" },
      });
      const service = createWorkflowService(mockDb);

      await expect(
        service.transitionRequest("request-123", "hr-1", "APPROVE"),
      ).rejects.toThrow();
    });

    it("REQUEST_CHANGE bypasses role check (any user can request changes)", async () => {
      const mockDb = createMockDb({
        request: { status: "PENDING_MANAGER" },
        actor: { id: "hr-1", role: "HR" },
      });
      const service = createWorkflowService(mockDb);

      // Should not throw - REQUEST_CHANGE is allowed regardless of role
      const result = await service.transitionRequest(
        "request-123",
        "hr-1",
        "REQUEST_CHANGE",
      );

      expect(result.newStatus).toBe("DRAFT");
    });
  });

  // ============================================================================
  // Tests: transitionRequest - PENDING_HR status
  // ============================================================================

  describe("transitionRequest - PENDING_HR status", () => {
    it("APPROVE by HR → PENDING_FINANCE", async () => {
      const mockDb = createMockDb({
        request: { status: "PENDING_HR" },
        actor: { id: "hr-1", role: "HR" },
      });
      const service = createWorkflowService(mockDb);

      const result = await service.transitionRequest(
        "request-123",
        "hr-1",
        "APPROVE",
      );

      expect(result.previousStatus).toBe("PENDING_HR");
      expect(result.newStatus).toBe("PENDING_FINANCE");
    });

    it("REJECT by HR → REJECTED", async () => {
      const mockDb = createMockDb({
        request: { status: "PENDING_HR" },
        actor: { id: "hr-1", role: "HR" },
      });
      const service = createWorkflowService(mockDb);

      const result = await service.transitionRequest(
        "request-123",
        "hr-1",
        "REJECT",
      );

      expect(result.previousStatus).toBe("PENDING_HR");
      expect(result.newStatus).toBe("REJECTED");
    });

    it("HOLD by HR → stays PENDING_HR", async () => {
      const mockDb = createMockDb({
        request: { status: "PENDING_HR" },
        actor: { id: "hr-1", role: "HR" },
      });
      const service = createWorkflowService(mockDb);

      const result = await service.transitionRequest(
        "request-123",
        "hr-1",
        "HOLD",
      );

      expect(result.previousStatus).toBe("PENDING_HR");
      expect(result.newStatus).toBe("PENDING_HR");
    });

    it("REQUEST_CHANGE by HR → DRAFT", async () => {
      const mockDb = createMockDb({
        request: { status: "PENDING_HR" },
        actor: { id: "hr-1", role: "HR" },
      });
      const service = createWorkflowService(mockDb);

      const result = await service.transitionRequest(
        "request-123",
        "hr-1",
        "REQUEST_CHANGE",
      );

      expect(result.previousStatus).toBe("PENDING_HR");
      expect(result.newStatus).toBe("DRAFT");
    });

    it("throws FORBIDDEN when MANAGER tries to approve PENDING_HR", async () => {
      const mockDb = createMockDb({
        request: { status: "PENDING_HR" },
        actor: { id: "manager-1", role: "MANAGER" },
      });
      const service = createWorkflowService(mockDb);

      await expect(
        service.transitionRequest("request-123", "manager-1", "APPROVE"),
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // Tests: transitionRequest - PENDING_FINANCE status
  // ============================================================================

  describe("transitionRequest - PENDING_FINANCE status", () => {
    it("APPROVE by FINANCE → PENDING_CEO", async () => {
      const mockDb = createMockDb({
        request: { status: "PENDING_FINANCE" },
        actor: { id: "finance-1", role: "FINANCE" },
      });
      const service = createWorkflowService(mockDb);

      const result = await service.transitionRequest(
        "request-123",
        "finance-1",
        "APPROVE",
      );

      expect(result.previousStatus).toBe("PENDING_FINANCE");
      expect(result.newStatus).toBe("PENDING_CEO");
    });

    it("REJECT by FINANCE → DRAFT", async () => {
      const mockDb = createMockDb({
        request: { status: "PENDING_FINANCE" },
        actor: { id: "finance-1", role: "FINANCE" },
      });
      const service = createWorkflowService(mockDb);

      const result = await service.transitionRequest(
        "request-123",
        "finance-1",
        "REJECT",
      );

      expect(result.previousStatus).toBe("PENDING_FINANCE");
      expect(result.newStatus).toBe("DRAFT");
    });

    it("REQUEST_CHANGE by FINANCE → DRAFT", async () => {
      const mockDb = createMockDb({
        request: { status: "PENDING_FINANCE" },
        actor: { id: "finance-1", role: "FINANCE" },
      });
      const service = createWorkflowService(mockDb);

      const result = await service.transitionRequest(
        "request-123",
        "finance-1",
        "REQUEST_CHANGE",
      );

      expect(result.previousStatus).toBe("PENDING_FINANCE");
      expect(result.newStatus).toBe("DRAFT");
    });
  });

  // ============================================================================
  // Tests: transitionRequest - PENDING_CEO status
  // ============================================================================

  describe("transitionRequest - PENDING_CEO status", () => {
    it("APPROVE by CEO → APPROVED_OPEN", async () => {
      const mockDb = createMockDb({
        request: { status: "PENDING_CEO" },
        actor: { id: "ceo-1", role: "CEO" },
      });
      const service = createWorkflowService(mockDb);

      const result = await service.transitionRequest(
        "request-123",
        "ceo-1",
        "APPROVE",
      );

      expect(result.previousStatus).toBe("PENDING_CEO");
      expect(result.newStatus).toBe("APPROVED_OPEN");
    });

    it("REJECT by CEO → REJECTED", async () => {
      const mockDb = createMockDb({
        request: { status: "PENDING_CEO" },
        actor: { id: "ceo-1", role: "CEO" },
      });
      const service = createWorkflowService(mockDb);

      const result = await service.transitionRequest(
        "request-123",
        "ceo-1",
        "REJECT",
      );

      expect(result.previousStatus).toBe("PENDING_CEO");
      expect(result.newStatus).toBe("REJECTED");
    });

    it("throws BadRequest for REQUEST_CHANGE from PENDING_CEO", async () => {
      const mockDb = createMockDb({
        request: { status: "PENDING_CEO" },
        actor: { id: "ceo-1", role: "CEO" },
      });
      const service = createWorkflowService(mockDb);

      await expect(
        service.transitionRequest("request-123", "ceo-1", "REQUEST_CHANGE"),
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // Tests: transitionRequest - APPROVED_OPEN status
  // ============================================================================

  describe("transitionRequest - APPROVED_OPEN status", () => {
    it("SUBMIT → HIRING_IN_PROGRESS", async () => {
      const mockDb = createMockDb({
        request: { status: "APPROVED_OPEN" },
        actor: { id: "hr-1", role: "HR" },
      });
      const service = createWorkflowService(mockDb);

      const result = await service.transitionRequest(
        "request-123",
        "hr-1",
        "SUBMIT",
      );

      expect(result.previousStatus).toBe("APPROVED_OPEN");
      expect(result.newStatus).toBe("HIRING_IN_PROGRESS");
    });

    it("throws BadRequest for APPROVE from APPROVED_OPEN", async () => {
      const mockDb = createMockDb({
        request: { status: "APPROVED_OPEN" },
        actor: { id: "hr-1", role: "HR" },
      });
      const service = createWorkflowService(mockDb);

      await expect(
        service.transitionRequest("request-123", "hr-1", "APPROVE"),
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // Tests: Error handling
  // ============================================================================

  describe("transitionRequest - error handling", () => {
    it("throws NOT_FOUND when request does not exist", async () => {
      const mockDb = createMockDb({
        request: null,
        actor: { id: "user-1", role: "MANAGER" },
      });
      const service = createWorkflowService(mockDb);

      await expect(
        service.transitionRequest("non-existent", "user-1", "APPROVE"),
      ).rejects.toThrow("Request not found");
    });

    it("throws NOT_FOUND when actor does not exist", async () => {
      const mockDb = createMockDb({
        request: { status: "PENDING_MANAGER" },
        actor: null,
      });
      const service = createWorkflowService(mockDb);

      await expect(
        service.transitionRequest(
          "request-123",
          "non-existent-user",
          "APPROVE",
        ),
      ).rejects.toThrow("Actor not found");
    });

    it("throws BadRequest for invalid status", async () => {
      const mockDb = createMockDb({
        request: { status: "ARCHIVED" as RequestStatus },
        actor: { id: "user-1", role: "HR" },
      });
      const service = createWorkflowService(mockDb);

      await expect(
        service.transitionRequest("request-123", "user-1", "APPROVE"),
      ).rejects.toThrow();
    });
  });
});
