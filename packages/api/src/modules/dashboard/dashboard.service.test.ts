import { describe, expect, it, mock } from "bun:test";
import { createDashboardService } from "./dashboard.service";

describe("DashboardService RBAC", () => {
  // A mock query builder that is both Thenable (for direct await) and has query methods
  const mockQueryBuilder = {
    where: mock(() => Promise.resolve([{ count: 10 }])),
    leftJoin: mock(() => ({
      where: mock(() => Promise.resolve([{ count: 10 }])),
    })),
    // biome-ignore lint/suspicious/noThenProperty: Mocking a Thenable
    then: (onfulfilled: any) =>
      Promise.resolve([{ count: 10 }]).then(onfulfilled),
  };

  const mockDb = {
    select: mock(() => ({
      from: mock(() => mockQueryBuilder),
    })),
  } as any;

  const service = createDashboardService(mockDb);

  it("should fetch stats for EMPLOYEE without error", async () => {
    const stats = await service.getDashboardStats("user-1", "EMPLOYEE");
    expect(stats).toBeDefined();
    // totalRequests should be 10 based on our mock
    expect(stats.totalRequests).toBe(10);
  });

  it("should fetch stats for MANAGER without error", async () => {
    const stats = await service.getDashboardStats("user-1", "MANAGER");
    expect(stats).toBeDefined();
  });

  it("should fetch action items for MANAGER", async () => {
    // Our mock returns count:10 for everything, so we should get actions
    const actions = await service.getActionsRequired("user-1", "MANAGER");
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0]?.title).toBe("Manpower Requests");
    expect(actions[0]?.count).toBe(10);
  });
});
