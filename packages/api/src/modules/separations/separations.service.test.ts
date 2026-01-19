import { describe, expect, it, mock } from "bun:test";
import { createSeparationsService } from "./separations.service";

describe("SeparationsService", () => {
  // Factory to create fresh mock for each test
  function createMockDb() {
    const mockDb: any = {
      insert: mock(() => ({
        values: mock(() => ({
          returning: mock(() =>
            Promise.resolve([{ id: "sep-123", status: "REQUESTED" }]),
          ),
        })),
      })),
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() =>
              Promise.resolve([{ id: "sep-123", status: "MANAGER_APPROVED" }]),
            ),
          })),
        })),
      })),
      select: mock(() => ({
        from: mock(() => ({
          where: mock(() => ({
            limit: mock(() =>
              Promise.resolve([
                { id: "user-1", role: "HR", name: "Test User" },
              ]),
            ),
          })),
        })),
      })),
      query: {
        separationRequest: {
          findFirst: mock(() =>
            Promise.resolve({ id: "sep-123", status: "DRAFT" }),
          ),
        },
      },
      transaction: mock((cb: (tx: any) => Promise<any>) => cb(mockDb)),
    };
    return mockDb;
  }

  it("should create a separation request", async () => {
    const mockDb = createMockDb();
    const service = createSeparationsService(mockDb);

    const input = {
      type: "RESIGNATION" as const,
      reason: "Moving to another company",
      lastWorkingDay: new Date("2024-12-31"),
      noticePeriodWaived: false,
    };
    const employeeId = "emp-1";

    const result = await service.create(input, employeeId);

    expect(result).toEqual(
      expect.objectContaining({ id: "sep-123", status: "REQUESTED" }),
    );
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("should get a separation request", async () => {
    const mockDb = createMockDb();
    const service = createSeparationsService(mockDb);

    const result = await service.get("sep-123");
    expect(result).toEqual(
      expect.objectContaining({ id: "sep-123", status: "DRAFT" }),
    );
  });

  it("should update a separation request", async () => {
    const mockDb = createMockDb();
    const service = createSeparationsService(mockDb);

    const input = {
      separationId: "sep-123",
      status: "MANAGER_APPROVED" as const,
    };

    const result = await service.update(input);

    expect(result).toEqual(
      expect.objectContaining({ id: "sep-123", status: "MANAGER_APPROVED" }),
    );
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("should update a checklist item", async () => {
    const mockDb = createMockDb();
    const service = createSeparationsService(mockDb);

    const input = {
      checklistId: "chk-1",
      status: "CLEARED" as const,
    };
    const userId = "user-1";

    // First select returns user with HR role
    // Second select returns checklist with HR department (matching the user's role)
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => ({
      from: mock(() => ({
        where: mock(() => ({
          limit: mock(() => {
            selectCallCount++;
            if (selectCallCount === 1) {
              // getActorRole call - return HR user
              return Promise.resolve([{ id: "user-1", role: "HR" }]);
            }
            // Get checklist call - return checklist with HR department
            return Promise.resolve([
              {
                id: "chk-1",
                separationId: "sep-123",
                department: "HR",
                status: "PENDING",
              },
            ]);
          }),
        })),
      })),
    }));

    // Mock update for checklist
    mockDb.update.mockReturnValueOnce({
      set: mock(() => ({
        where: mock(() => ({
          returning: mock(() =>
            Promise.resolve([{ id: "chk-1", status: "CLEARED" }]),
          ),
        })),
      })),
    });

    // Mock insert for audit log
    mockDb.insert.mockReturnValueOnce({
      values: mock(() => Promise.resolve()),
    });

    const result = await service.updateChecklist(input, userId);

    expect(result).toEqual(
      expect.objectContaining({ id: "chk-1", status: "CLEARED" }),
    );
    expect(mockDb.update).toHaveBeenCalled();
  });
});
