import { describe, expect, it, mock } from "bun:test";
import { createDashboardService } from "./dashboard.service";

describe("DashboardService RBAC", () => {
  const getMockRows = (selection?: Record<string, unknown>) => {
    if (selection && "positionId" in selection) {
      return [
        {
          positionId: "pos-1",
          positionRole: "MANAGER",
          departmentId: "dep-1",
          reportsToPositionId: null,
        },
      ];
    }

    if (selection && "role" in selection) {
      return [{ role: "MANAGER" }];
    }

    return [{ count: 10 }];
  };

  const createQueryBuilder = (selection?: Record<string, unknown>) => {
    const rows = getMockRows(selection);

    const queryBuilder: any = {
      from: mock(() => queryBuilder),
      innerJoin: mock(() => queryBuilder),
      leftJoin: mock(() => queryBuilder),
      where: mock(() => queryBuilder),
      limit: mock(() => queryBuilder),
      orderBy: mock(() => queryBuilder),
      // biome-ignore lint/suspicious/noThenProperty: Mocking a Thenable
      then: (onfulfilled: any) => Promise.resolve(rows).then(onfulfilled),
    };

    return queryBuilder;
  };

  const mockDb = {
    select: mock((selection?: Record<string, unknown>) =>
      createQueryBuilder(selection),
    ),
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
