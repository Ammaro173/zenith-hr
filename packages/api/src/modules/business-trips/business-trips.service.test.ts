import { describe, expect, it, mock } from "bun:test";
import { createBusinessTripsService } from "./business-trips.service";

describe("BusinessTripsService", () => {
  const mockDb = {
    insert: mock(() => ({
      values: mock(() => ({
        returning: mock(() =>
          Promise.resolve([{ id: "trip-123", status: "DRAFT" }]),
        ),
      })),
    })),
    update: mock(() => ({
      set: mock(() => ({
        where: mock(() => ({
          returning: mock(() =>
            Promise.resolve([{ id: "trip-123", status: "SUBMITTED" }]),
          ),
        })),
      })),
    })),
    query: {
      businessTrip: {
        findFirst: mock(() =>
          Promise.resolve({
            id: "trip-123",
            status: "DRAFT",
            requesterId: "user-1",
          }),
        ),
        findMany: mock(() => Promise.resolve([])),
      },
      tripExpense: {
        findMany: mock(() => Promise.resolve([])),
      },
    },
    select: mock(() => ({
      from: mock(() => ({
        where: mock(() => ({
          limit: mock(() =>
            Promise.resolve([
              { id: "trip-123", status: "DRAFT", requesterId: "user-1" },
            ]),
          ),
        })),
      })),
    })),
    transaction: mock((cb) => cb(mockDb)),
  } as any;

  const mockWorkflowService = {
    getNextApproverIdForStatus: mock(() => Promise.resolve("manager-1")),
    getApproverForStatus: mock(() => "MANAGER"),
  } as any;

  const service = createBusinessTripsService(mockDb, mockWorkflowService);

  it("should create a business trip", async () => {
    const input = {
      country: "United States",
      city: "New York",
      purposeType: "CONFERENCE_EXHIBITION" as const,
      purposeDetails: "Annual tech conference",
      startDate: new Date("2024-01-01T00:00:00Z"),
      endDate: new Date("2024-01-05T00:00:00Z"),
      estimatedCost: 1000,
      currency: "USD",
      visaRequired: false,
      needsFlightBooking: true,
      needsHotelBooking: true,
      departureCity: "Doha",
      arrivalCity: "New York",
    };
    const requesterId = "user-1";

    const result = await service.create(input, requesterId);

    expect(result).toEqual(
      expect.objectContaining({ id: "trip-123", status: "DRAFT" }),
    );
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("should transition a trip status", async () => {
    const input = {
      tripId: "trip-123",
      action: "SUBMIT" as const,
    };
    const actorId = "user-1";

    // Mock findFirst to return a DRAFT trip owned by user-1
    mockDb.query.businessTrip.findFirst.mockResolvedValueOnce({
      id: "trip-123",
      status: "DRAFT",
      requesterId: "user-1",
    });

    const result = await service.transition(input, actorId);

    expect(result).toEqual(
      expect.objectContaining({ id: "trip-123", status: "SUBMITTED" }),
    );
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("should add an expense to a trip", async () => {
    const input = {
      tripId: "trip-123",
      amount: 50,
      currency: "USD",
      category: "MEAL" as const,
      date: new Date("2024-01-02T00:00:00Z"),
      description: "Lunch",
    };

    // Mock insert for expense
    mockDb.insert.mockReturnValueOnce({
      values: mock(() => ({
        returning: mock(() =>
          Promise.resolve([
            {
              id: "expense-1",
              ...input,
              amount: input.amount.toString(), // DB returns decimal as string
              date: new Date(input.date),
            },
          ]),
        ),
      })),
    });

    const result = await service.addExpense(input);

    expect(result).toEqual(
      expect.objectContaining({ id: "expense-1", tripId: input.tripId }),
    );
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("should scope pending approvals to current approver", async () => {
    const actorId = "manager-1";

    // 1) getActorRole(db, actorId)
    const roleLimitMock = mock(() => Promise.resolve([{ role: "MANAGER" }]));
    const roleWhereMock = mock(() => ({ limit: roleLimitMock }));
    const roleFromMock = mock(() => ({ where: roleWhereMock }));
    mockDb.select.mockReturnValueOnce({ from: roleFromMock });

    // 2) getPendingApprovals query itself
    const approvalsWhereMock = mock(() => Promise.resolve([{ id: "trip-1" }]));
    const approvalsFromMock = mock(() => ({ where: approvalsWhereMock }));
    mockDb.select.mockReturnValueOnce({ from: approvalsFromMock });

    const result = await service.getPendingApprovals(actorId);

    expect(result).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "trip-1" })]),
    );
    expect(roleFromMock).toHaveBeenCalled();
    expect(roleWhereMock).toHaveBeenCalled();
    expect(roleLimitMock).toHaveBeenCalled();
    expect(approvalsFromMock).toHaveBeenCalled();
    expect(approvalsWhereMock).toHaveBeenCalled();
  });
});
