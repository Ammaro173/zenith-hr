import { describe, expect, it, mock } from "bun:test";
import { AppError } from "../../shared/errors";
import type { NotificationsService } from "../notifications/notifications.service";
import type { WorkflowService } from "../workflow";
import { createRequestsService } from "./requests.service";

describe("RequestsService", () => {
  const mockDb = {
    execute: mock(() => Promise.resolve({ rows: [{ value: "1" }] })),
    select: mock(() => ({
      from: mock(() => Promise.resolve([{ value: "1" }])),
      where: mock(() => ({
        limit: mock(() => Promise.resolve([])), // for getActorRole check
      })),
    })),
    insert: mock(() => ({
      values: mock(() => ({
        returning: mock(() =>
          Promise.resolve([
            {
              id: "req-1",
              requestCode: "MPR-0001",
              status: "PENDING_HR",
              requesterId: "user-1",
            },
          ]),
        ),
      })),
    })),
  } as any;

  const mockWorkflowService = {
    getNextApproverIdForStatus: mock(() => Promise.resolve("manager-1")),
    getApproverForStatus: mock(() => "MANAGER"),
  } as unknown as WorkflowService;

  const mockNotificationsService = {
    createNotification: mock(() => Promise.resolve()),
    getUserNotifications: mock(),
    markAsRead: mock(),
    getUnreadCount: mock(),
  } as unknown as NotificationsService;

  const service = createRequestsService(
    mockDb,
    mockWorkflowService,
    mockNotificationsService,
  );

  it("should generate correct request code from sequence", async () => {
    // Override the mock for specific sequence return if needed,
    // but the default one above returns "1"
    const code = await service.generateRequestCode();
    expect(code).toBe("MPR-0001");
  });

  it("should pad request code with zeros", async () => {
    // Mock returning a larger number
    mockDb.execute.mockResolvedValueOnce({ rows: [{ value: "42" }] });

    const code = await service.generateRequestCode();
    expect(code).toBe("MPR-0042");
  });

  it("should handle larger numbers correctly", async () => {
    // Mock returning a larger number
    mockDb.execute.mockResolvedValueOnce({ rows: [{ value: "1234" }] });

    const code = await service.generateRequestCode();
    expect(code).toBe("MPR-1234");
  });

  it("should reject editing requests outside draft or change-requested status", async () => {
    const existingRequest = {
      id: "req-2",
      version: 3,
      requesterId: "user-1",
      status: "APPROVED",
      salaryRangeMin: "1000",
      salaryRangeMax: "2000",
      requestType: "NEW_POSITION",
      replacementForUserId: null,
      positionDetails: {},
      budgetDetails: {},
      contractDuration: "FULL_TIME",
      justificationText: "Existing justification",
      requiredApproverRole: null,
    };

    const updateTx = {
      select: mock(() => ({
        from: mock(() => ({
          where: mock(() => ({
            limit: mock(() => Promise.resolve([existingRequest])),
          })),
        })),
      })),
      insert: mock(() => ({
        values: mock(() => Promise.resolve()),
      })),
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => Promise.resolve([])),
          })),
        })),
      })),
    };

    const updateDb = {
      transaction: mock(
        async (callback: (tx: typeof updateTx) => Promise<unknown>) =>
          await callback(updateTx),
      ),
    } as any;

    const updateService = createRequestsService(
      updateDb,
      mockWorkflowService,
      mockNotificationsService,
    );

    try {
      await updateService.update(
        "req-2",
        {
          requestType: "NEW_POSITION",
          contractDuration: "FULL_TIME",
          employmentType: "FULL_TIME",
          headcount: 1,
          positionId: undefined,
          justificationText: "Updated justification",
          salaryRangeMin: 1200,
          salaryRangeMax: 2200,
          positionDetails: {
            title: "Analyst",
            department: "Finance",
            location: "Doha",
          },
          budgetDetails: {
            currency: "QAR",
          },
        },
        3,
        "user-1",
      );
      throw new Error("Expected update to be rejected");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("FORBIDDEN");
      expect((error as AppError).message).toBe(
        "Only draft or change-requested requests can be edited",
      );
    }
  });
});
