import { describe, expect, it, mock } from "bun:test";
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
});
