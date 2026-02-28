import { describe, expect, it, mock } from "bun:test";
import type { PositionRole, RequestStatus, UserRole } from "../../shared/types";
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
      requesterPositionId: string;
      currentApproverPositionId: string | null;
      requiredApproverRole: PositionRole | null;
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
    requester?: Partial<any> | null;
  } = {},
) {
  const defaultRequest = {
    id: "request-123",
    status: "DRAFT" as RequestStatus,
    requesterId: "user-1",
    requesterPositionId: "pos-1",
    currentApproverPositionId: "pos-1",
    requiredApproverRole: null as PositionRole | null,
    revisionVersion: 1,
    positionDetails: {},
    budgetDetails: {},
  };

  const defaultActor = {
    id: "user-1",
    role: "EMPLOYEE" as UserRole,
    name: "Test User",
    positionId: overrides.actor?.id ?? "pos-1",
    positionRole: "EMPLOYEE",
    departmentId: "dept-1",
    reportsToPositionId: null,
  };

  const defaultRequester = {
    id: overrides.request?.requesterId ?? "user-1",
    role: "EMPLOYEE" as UserRole,
    name: "Requester User",
    positionId: "pos-1",
    positionRole: "EMPLOYEE",
    departmentId: "dept-1",
    reportsToPositionId: null,
  };

  const request =
    overrides.request === null
      ? null
      : { ...defaultRequest, ...overrides.request };
  const actor =
    overrides.actor === null
      ? null
      : {
          ...defaultActor,
          ...overrides.actor,
          positionRole: overrides.actor?.role ?? defaultActor.role,
        };
  const requester =
    overrides.requester === null
      ? null
      : {
          ...defaultRequester,
          ...overrides.requester,
          positionRole: overrides.requester?.role ?? defaultRequester.role,
        };

  let selectCallCount = 0;

  const mockDb = {
    select: mock(() => {
      const getArrayResult = () => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return request ? [request] : [];
        }
        if (
          selectCallCount === 2 ||
          selectCallCount === 3 ||
          selectCallCount === 5 ||
          selectCallCount === 6
        ) {
          return actor ? [actor] : [];
        }
        if (selectCallCount === 4) {
          return requester ? [requester] : [];
        }
        if (overrides.targetRoleUser) {
          return [overrides.targetRoleUser];
        }
        if (overrides.hrUser) {
          return [overrides.hrUser];
        }
        return [{ id: "approver-1", userId: "approver-1" }];
      };

      const qb: any = {
        from: mock(() => qb),
        innerJoin: mock(() => qb),
        where: mock(() => qb),
        limit: mock(() => Promise.resolve(getArrayResult())),
        // biome-ignore lint/suspicious/noThenProperty: mock object
        then: (onFulfilled: any) =>
          Promise.resolve(getArrayResult()).then(onFulfilled),
      };
      return qb;
    }),
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
      expect(service.getApproverForStatus("PENDING_HR")).toBe("HOD_HR");
    });

    it("returns FINANCE for PENDING_FINANCE status", () => {
      expect(service.getApproverForStatus("PENDING_FINANCE")).toBe(
        "HOD_FINANCE",
      );
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
  // Tests: transitionRequest - DRAFT status
  // ============================================================================

  describe("transitionRequest - DRAFT status", () => {
    it("SUBMIT by EMPLOYEE → PENDING_MANAGER", async () => {
      const mockDb = createMockDb({
        request: { status: "DRAFT", requesterId: "user-1" },
        actor: { id: "user-1", role: "EMPLOYEE" },
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
        requester: { id: "manager-1", role: "MANAGER" },
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

    it("SUBMIT by HR → PENDING_FINANCE (skips PENDING_MANAGER)", async () => {
      const mockDb = createMockDb({
        request: { status: "DRAFT", requesterId: "hr-1" },
        actor: { id: "hr-1", role: "HOD_HR" },
        requester: { id: "hr-1", role: "HOD_HR" },
      });
      const service = createWorkflowService(mockDb);

      const result = await service.transitionRequest(
        "request-123",
        "hr-1",
        "SUBMIT",
      );

      expect(result.previousStatus).toBe("DRAFT");
      expect(result.newStatus).toBe("PENDING_FINANCE");
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
        request: {
          status: "PENDING_MANAGER",
          currentApproverPositionId: "manager-1",
        },
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
        request: {
          status: "PENDING_MANAGER",
          currentApproverPositionId: "manager-1",
        },
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
        request: {
          status: "PENDING_MANAGER",
          currentApproverPositionId: "manager-1",
        },
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
        actor: { id: "hr-1", role: "HOD_HR" },
      });
      const service = createWorkflowService(mockDb);

      await expect(
        service.transitionRequest("request-123", "hr-1", "APPROVE"),
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // Tests: transitionRequest - PENDING_HR status
  // ============================================================================

  describe("transitionRequest - PENDING_HR status", () => {
    it("APPROVE by HR → PENDING_FINANCE", async () => {
      const mockDb = createMockDb({
        request: { status: "PENDING_HR", requiredApproverRole: "HOD_HR" },
        actor: { id: "hr-1", role: "HOD_HR" },
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
        request: { status: "PENDING_HR", requiredApproverRole: "HOD_HR" },
        actor: { id: "hr-1", role: "HOD_HR" },
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
        request: { status: "PENDING_HR", requiredApproverRole: "HOD_HR" },
        actor: { id: "hr-1", role: "HOD_HR" },
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
        request: { status: "PENDING_HR", requiredApproverRole: "HOD_HR" },
        actor: { id: "hr-1", role: "HOD_HR" },
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
        request: {
          status: "PENDING_FINANCE",
          requiredApproverRole: "HOD_FINANCE",
        },
        actor: { id: "finance-1", role: "HOD_FINANCE" },
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
        request: {
          status: "PENDING_FINANCE",
          requiredApproverRole: "HOD_FINANCE",
        },
        actor: { id: "finance-1", role: "HOD_FINANCE" },
      });
      const service = createWorkflowService(mockDb);

      const result = await service.transitionRequest(
        "request-123",
        "finance-1",
        "REJECT",
      );

      expect(result.previousStatus).toBe("PENDING_FINANCE");
      expect(result.newStatus).toBe("REJECTED");
    });

    it("REQUEST_CHANGE by FINANCE → DRAFT", async () => {
      const mockDb = createMockDb({
        request: {
          status: "PENDING_FINANCE",
          requiredApproverRole: "HOD_FINANCE",
        },
        actor: { id: "finance-1", role: "HOD_FINANCE" },
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
    it("APPROVE by CEO → HIRING_IN_PROGRESS", async () => {
      const mockDb = createMockDb({
        request: { status: "PENDING_CEO", requiredApproverRole: "CEO" },
        actor: { id: "ceo-1", role: "CEO" },
      });
      const service = createWorkflowService(mockDb);

      const result = await service.transitionRequest(
        "request-123",
        "ceo-1",
        "APPROVE",
      );

      expect(result.previousStatus).toBe("PENDING_CEO");
      expect(result.newStatus).toBe("HIRING_IN_PROGRESS");
    });

    it("REJECT by CEO → REJECTED", async () => {
      const mockDb = createMockDb({
        request: { status: "PENDING_CEO", requiredApproverRole: "CEO" },
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

    it("REQUEST_CHANGE from PENDING_CEO → DRAFT", async () => {
      const mockDb = createMockDb({
        request: { status: "PENDING_CEO", requiredApproverRole: "CEO" },
        actor: { id: "ceo-1", role: "CEO" },
      });
      const service = createWorkflowService(mockDb);

      const result = await service.transitionRequest(
        "request-123",
        "ceo-1",
        "REQUEST_CHANGE",
      );

      expect(result.previousStatus).toBe("PENDING_CEO");
      expect(result.newStatus).toBe("DRAFT");
    });
  });

  // ============================================================================
  // Tests: transitionRequest - HIRING_IN_PROGRESS status
  // ============================================================================

  describe("transitionRequest - HIRING_IN_PROGRESS status", () => {
    it("APPROVE by HR → COMPLETED", async () => {
      const mockDb = createMockDb({
        request: { status: "HIRING_IN_PROGRESS" as RequestStatus },
        actor: { id: "hr-1", role: "HOD_HR" },
      });
      const service = createWorkflowService(mockDb);

      const result = await service.transitionRequest(
        "request-123",
        "hr-1",
        "APPROVE",
      );

      expect(result.previousStatus).toBe("HIRING_IN_PROGRESS");
      expect(result.newStatus).toBe("COMPLETED");
    });

    it("APPROVE by ADMIN → COMPLETED", async () => {
      const mockDb = createMockDb({
        request: { status: "HIRING_IN_PROGRESS" as RequestStatus },
        actor: { id: "admin-1", role: "ADMIN" },
      });
      const service = createWorkflowService(mockDb);

      const result = await service.transitionRequest(
        "request-123",
        "admin-1",
        "APPROVE",
      );

      expect(result.previousStatus).toBe("HIRING_IN_PROGRESS");
      expect(result.newStatus).toBe("COMPLETED");
    });

    it("throws FORBIDDEN when EMPLOYEE tries to complete hiring", async () => {
      const mockDb = createMockDb({
        request: { status: "HIRING_IN_PROGRESS" as RequestStatus },
        actor: { id: "user-1", role: "EMPLOYEE" },
      });
      const service = createWorkflowService(mockDb);

      await expect(
        service.transitionRequest("request-123", "user-1", "APPROVE"),
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
        actor: { id: "user-1", role: "HOD_HR" },
      });
      const service = createWorkflowService(mockDb);

      await expect(
        service.transitionRequest("request-123", "user-1", "APPROVE"),
      ).rejects.toThrow();
    });
  });
});
