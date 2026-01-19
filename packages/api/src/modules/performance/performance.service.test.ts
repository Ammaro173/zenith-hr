import { describe, expect, it, mock } from "bun:test";
import { createPerformanceService } from "./performance.service";

describe("PerformanceService", () => {
  // Factory to create fresh mock for each test
  function createMockDb() {
    const mockDb: any = {
      insert: mock(() => ({
        values: mock(() => ({
          returning: mock(() =>
            Promise.resolve([{ id: "cycle-123", status: "DRAFT" }]),
          ),
        })),
      })),
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() =>
              Promise.resolve([{ id: "review-123", overallRating: 4 }]),
            ),
          })),
        })),
      })),
      select: mock(() => ({
        from: mock(() => ({
          where: mock(() => ({
            orderBy: mock(() => Promise.resolve([])),
            limit: mock(() => Promise.resolve([])),
          })),
        })),
      })),
      query: {
        performanceCycle: {
          findMany: mock(() => Promise.resolve([])),
        },
        performanceReview: {
          findFirst: mock(() =>
            Promise.resolve({ id: "review-123", status: "DRAFT" }),
          ),
        },
        competencyTemplate: {
          findMany: mock(() => Promise.resolve([])),
        },
      },
      transaction: mock((cb: (tx: any) => Promise<any>) => cb(mockDb)),
    };
    return mockDb;
  }

  it("should create a performance cycle", async () => {
    const mockDb = createMockDb();
    const service = createPerformanceService(mockDb);

    const input = {
      name: "Q4 2024",
      startDate: "2024-10-01T00:00:00Z",
      endDate: "2024-12-31T00:00:00Z",
    };

    const result = await service.createCycle(input);

    expect(result).toEqual(
      expect.objectContaining({ id: "cycle-123", status: "DRAFT" }),
    );
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("should create a performance review", async () => {
    const mockDb = createMockDb();
    const service = createPerformanceService(mockDb);

    const input = {
      cycleId: "cycle-123",
      employeeId: "emp-1",
      reviewerId: "mgr-1",
      reviewType: "ANNUAL_PERFORMANCE" as const,
    };

    // Mock insert to return created review
    mockDb.insert.mockReturnValueOnce({
      values: mock(() => ({
        returning: mock(() =>
          Promise.resolve([{ id: "review-123", status: "DRAFT", ...input }]),
        ),
      })),
    });

    // Mock select for global templates
    mockDb.select.mockReturnValueOnce({
      from: mock(() => ({
        where: mock(() => ({
          orderBy: mock(() => Promise.resolve([])),
        })),
      })),
    });

    const result = await service.createReview(input);

    expect(result).toEqual(
      expect.objectContaining({ id: "review-123", status: "DRAFT" }),
    );
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("should update a performance review", async () => {
    const mockDb = createMockDb();
    const service = createPerformanceService(mockDb);

    const input = {
      reviewId: "review-123",
      overallRating: 4,
      overallComment: "Great work!",
    };

    const result = await service.updateReview(input);

    expect(result).toEqual(
      expect.objectContaining({ id: "review-123", overallRating: 4 }),
    );
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("should create a performance goal", async () => {
    const mockDb = createMockDb();
    const service = createPerformanceService(mockDb);

    const input = {
      reviewId: "review-123",
      title: "Increase sales",
      description: "Increase sales by 10%",
      weight: 20,
    };

    // Mock insert for goal
    mockDb.insert.mockReturnValueOnce({
      values: mock(() => ({
        returning: mock(() =>
          Promise.resolve([{ id: "goal-1", status: "PENDING", ...input }]),
        ),
      })),
    });

    const result = await service.createGoal(input);

    expect(result).toEqual(
      expect.objectContaining({ id: "goal-1", status: "PENDING" }),
    );
    expect(mockDb.insert).toHaveBeenCalled();
  });
});
