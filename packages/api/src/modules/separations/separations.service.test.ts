import { describe, expect, it, mock } from "bun:test";
import { createSeparationsService } from "./separations.service";

describe("SeparationsService", () => {
  const mockDb = {
    insert: mock(() => ({
      values: mock(() => ({
        returning: mock(() =>
          Promise.resolve([{ id: "sep-123", status: "DRAFT" }]),
        ),
      })),
    })),
    update: mock(() => ({
      set: mock(() => ({
        where: mock(() => ({
          returning: mock(() =>
            Promise.resolve([{ id: "sep-123", status: "SUBMITTED" }]),
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
    transaction: mock((cb) => cb(mockDb)),
  } as any;

  const service = createSeparationsService(mockDb);

  it("should create a separation request", async () => {
    const input = {
      type: "RESIGNATION" as const,
      reason: "Moving to another company",
      lastWorkingDay: "2024-12-31",
    };
    const employeeId = "emp-1";

    const result = await service.create(input, employeeId);

    expect(result).toEqual(
      expect.objectContaining({ id: "sep-123", status: "DRAFT" }),
    );
    // Should insert request and checklist items
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
  });

  it("should get a separation request", async () => {
    const result = await service.get("sep-123");
    expect(result).toEqual(
      expect.objectContaining({ id: "sep-123", status: "DRAFT" }),
    );
  });

  it("should update a separation request", async () => {
    const input = {
      separationId: "sep-123",
      status: "SUBMITTED" as const,
    };

    const result = await service.update(input);

    expect(result).toEqual(
      expect.objectContaining({ id: "sep-123", status: "SUBMITTED" }),
    );
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("should update a checklist item", async () => {
    const input = {
      checklistId: "chk-1",
      status: "COMPLETED" as const,
    };
    const userId = "user-1";

    // Mock update for checklist
    mockDb.update.mockReturnValueOnce({
      set: mock(() => ({
        where: mock(() => ({
          returning: mock(() =>
            Promise.resolve([{ id: "chk-1", status: "COMPLETED" }]),
          ),
        })),
      })),
    });

    const result = await service.updateChecklist(input, userId);

    expect(result).toEqual(
      expect.objectContaining({ id: "chk-1", status: "COMPLETED" }),
    );
    expect(mockDb.update).toHaveBeenCalled();
  });
});
