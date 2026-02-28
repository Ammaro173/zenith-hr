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
    select: mock(() => {
      const qb: any = {
        from: mock(() => qb),
        innerJoin: mock(() => qb),
        where: mock(() => qb),
        limit: mock(() =>
          Promise.resolve([
            {
              id: "trip-123",
              status: "DRAFT",
              requesterId: "user-1",
              requesterPositionId: "pos-1",
              positionId: "pos-1",
              positionRole: "EMPLOYEE",
              role: "EMPLOYEE",
              departmentId: "dept-1",
              reportsToPositionId: "pos-2",
            },
          ]),
        ),
        // biome-ignore lint/suspicious/noThenProperty: mock object
        then: (onFulfilled: any) =>
          Promise.resolve([
            {
              id: "trip-123",
              status: "DRAFT",
              requesterId: "user-1",
              requesterPositionId: "pos-1",
              positionId: "pos-1",
              positionRole: "EMPLOYEE",
              role: "EMPLOYEE",
              departmentId: "dept-1",
              reportsToPositionId: "pos-2",
            },
          ]).then(onFulfilled),
      };
      return qb;
    }),
    transaction: mock((cb) => cb(mockDb)),
  } as any;

  const mockWorkflowService = {
    getNextTripApprover: mock(() =>
      Promise.resolve({
        approverPositionId: "pos-1",
        approverRole: "MANAGER",
        nextStatus: "PENDING_MANAGER",
      }),
    ),
    getTripApproverForStatus: mock(() =>
      Promise.resolve({ approverPositionId: null, approverRole: null }),
    ),
    canActorTransition: mock(() => Promise.resolve(true)),
    getInitialStatusForRequester: mock(() =>
      Promise.resolve("PENDING_MANAGER"),
    ),
    getNextApproverIdForStatus: mock(() => Promise.resolve("manager-1")),
    getApproverForStatus: mock(() => "MANAGER"),
    getInitiatorRouteKey: mock(() => Promise.resolve("EMPLOYEE")),
    getApprovalSequenceForInitiator: mock(() => [
      "PENDING_MANAGER",
      "PENDING_HR",
      "PENDING_FINANCE",
      "PENDING_CEO",
      "APPROVED",
    ]),
  } as any;

  const service = createBusinessTripsService(mockDb, mockWorkflowService);

  const baseTripInput = {
    country: "United States",
    city: "New York",
    purposeType: "CONFERENCE_EXHIBITION" as const,
    purposeDetails: "Annual tech conference",
    startDate: new Date("2024-01-01T00:00:00Z"),
    endDate: new Date("2024-01-05T00:00:00Z"),
    estimatedCost: 1000,
    currency: "QAR",
    visaRequired: false,
    needsFlightBooking: true,
    needsHotelBooking: true,
    departureCity: "Doha",
    arrivalCity: "New York",
  };

  it("should create a trip with PENDING_MANAGER for a standard employee", async () => {
    mockWorkflowService.getNextTripApprover.mockResolvedValueOnce({
      positionId: "pos-1",
      requiredRole: "MANAGER",
      nextStatus: "PENDING_MANAGER",
    });

    mockDb.insert.mockReturnValueOnce({
      values: mock((data) => ({
        returning: mock(() =>
          Promise.resolve([{ id: "trip-123", status: data.status }]),
        ),
      })),
    });

    const result = await service.create(baseTripInput, "user-1");

    expect(result).toEqual(
      expect.objectContaining({ id: "trip-123", status: "PENDING_MANAGER" }),
    );
    expect(mockWorkflowService.getNextTripApprover).toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("should create a trip with PENDING_HR for CEO (skips manager)", async () => {
    mockWorkflowService.getNextTripApprover.mockResolvedValueOnce({
      positionId: "pos-1",
      requiredRole: "HOD_HR",
      nextStatus: "PENDING_HR",
    });

    mockDb.insert.mockReturnValueOnce({
      values: mock((data) => ({
        returning: mock(() =>
          Promise.resolve([{ id: "trip-ceo", status: data.status }]),
        ),
      })),
    });

    const result = await service.create(baseTripInput, "ceo-1");

    expect(result).toEqual(
      expect.objectContaining({ id: "trip-ceo", status: "PENDING_HR" }),
    );
  });

  it("should create a trip with PENDING_HR for Finance (skips finance step)", async () => {
    mockWorkflowService.getNextTripApprover.mockResolvedValueOnce({
      positionId: "pos-1",
      requiredRole: "HOD_HR",
      nextStatus: "PENDING_HR",
    });

    mockDb.insert.mockReturnValueOnce({
      values: mock((data) => ({
        returning: mock(() =>
          Promise.resolve([{ id: "trip-fin", status: data.status }]),
        ),
      })),
    });

    const result = await service.create(baseTripInput, "finance-1");

    expect(result).toEqual(
      expect.objectContaining({ id: "trip-fin", status: "PENDING_HR" }),
    );
  });

  it("should create a trip with PENDING_FINANCE for HR (skips HR step)", async () => {
    mockWorkflowService.getNextTripApprover.mockResolvedValueOnce({
      positionId: "pos-1",
      requiredRole: "HOD_FINANCE",
      nextStatus: "PENDING_FINANCE",
    });

    mockDb.insert.mockReturnValueOnce({
      values: mock((data) => ({
        returning: mock(() =>
          Promise.resolve([{ id: "trip-hr", status: data.status }]),
        ),
      })),
    });

    const result = await service.create(baseTripInput, "hr-1");

    expect(result).toEqual(
      expect.objectContaining({ id: "trip-hr", status: "PENDING_FINANCE" }),
    );
  });

  it("should create a trip with PENDING_HR for Manager (skips manager step)", async () => {
    mockWorkflowService.getNextTripApprover.mockResolvedValueOnce({
      positionId: "pos-1",
      requiredRole: "HOD_HR",
      nextStatus: "PENDING_HR",
    });

    mockDb.insert.mockReturnValueOnce({
      values: mock((data) => ({
        returning: mock(() =>
          Promise.resolve([{ id: "trip-mgr", status: data.status }]),
        ),
      })),
    });

    const result = await service.create(baseTripInput, "manager-1");

    expect(result).toEqual(
      expect.objectContaining({ id: "trip-mgr", status: "PENDING_HR" }),
    );
  });

  it("should transition a trip status via SUBMIT", async () => {
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
      requesterPositionId: "pos-1",
    });

    mockWorkflowService.getNextTripApprover.mockResolvedValueOnce({
      positionId: "pos-2",
      requiredRole: "MANAGER",
      nextStatus: "PENDING_MANAGER",
    });

    mockDb.update.mockReturnValueOnce({
      set: mock(() => ({
        where: mock(() => ({
          returning: mock(() =>
            Promise.resolve([{ id: "trip-123", status: "PENDING_MANAGER" }]),
          ),
        })),
      })),
    });

    const result = await service.transition(input, actorId);

    expect(result).toEqual(
      expect.objectContaining({ id: "trip-123", status: "PENDING_MANAGER" }),
    );
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("should add an expense to a trip", async () => {
    const input = {
      tripId: "trip-123",
      amount: 50,
      currency: "QAR",
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
    const roleLimitMock = mock(() =>
      Promise.resolve([
        {
          role: "MANAGER",
          positionRole: "MANAGER",
          positionId: "pos-1",
          departmentId: "dep-1",
          reportsToPositionId: null,
        },
      ]),
    );
    const roleWhereMock = mock(() => ({ limit: roleLimitMock }));
    const roleInnerJoinMock = mock(() => ({ where: roleWhereMock }));
    const roleFromMock = mock(() => ({ innerJoin: roleInnerJoinMock }));
    mockDb.select.mockReturnValueOnce({ from: roleFromMock });
    mockDb.select.mockReturnValueOnce({ from: roleFromMock });

    // 3) getPendingApprovals query: select().from().innerJoin().where().orderBy()
    const approvalsOrderByMock = mock(() =>
      Promise.resolve([
        {
          trip: { id: "trip-1", requesterId: "user-1" },
          requester: {
            id: "user-1",
            name: "Test",
            email: "t@t.com",
            image: null,
          },
        },
      ]),
    );
    const approvalsWhereMock = mock(() => ({ orderBy: approvalsOrderByMock }));
    const approvalsInnerJoinMock = mock(() => ({ where: approvalsWhereMock }));
    const approvalsFromMock = mock(() => ({
      innerJoin: approvalsInnerJoinMock,
    }));
    mockDb.select.mockReturnValueOnce({ from: approvalsFromMock });

    const result = await service.getPendingApprovals(actorId);

    expect(result).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "trip-1" })]),
    );
    expect(roleFromMock).toHaveBeenCalled();
    expect(roleWhereMock).toHaveBeenCalled();
    expect(roleLimitMock).toHaveBeenCalled();
    expect(approvalsFromMock).toHaveBeenCalled();
    expect(approvalsInnerJoinMock).toHaveBeenCalled();
    expect(approvalsWhereMock).toHaveBeenCalled();
    expect(approvalsOrderByMock).toHaveBeenCalled();
  });

  // --- Transition: APPROVE ---

  it("APPROVE should advance employee trip from PENDING_MANAGER to PENDING_HR", async () => {
    // 1) tx.select().from().where().limit() — fetch trip
    const tripLimitMock = mock(() =>
      Promise.resolve([
        {
          id: "trip-200",
          status: "PENDING_MANAGER",
          requesterId: "user-1",
          currentApproverId: "manager-1",
          currentApproverRole: "MANAGER",
          requesterPositionId: "pos-1",
          version: 0,
          city: "Doha",
          country: "Qatar",
        },
      ]),
    );
    const tripWhereMock = mock(() => ({
      limit: tripLimitMock,
      // biome-ignore lint/suspicious/noThenProperty: mock object
      then: (resolve: any) => tripLimitMock().then(resolve),
    }));
    const tripFromMock = mock(() => ({ where: tripWhereMock }));
    mockDb.select.mockReturnValueOnce({ from: tripFromMock });

    // 2) getActorPositionInfo → tx.select().from().innerJoin().where().limit()
    const roleLimitMock = mock(() =>
      Promise.resolve([
        {
          role: "MANAGER",
          positionRole: "MANAGER",
          positionId: "pos-1",
          departmentId: "dep-1",
          reportsToPositionId: null,
        },
      ]),
    );
    const roleWhereMock = mock(() => ({ limit: roleLimitMock }));
    const roleInnerJoinMock = mock(() => ({ where: roleWhereMock }));
    const roleFromMock = mock(() => ({ innerJoin: roleInnerJoinMock }));
    mockDb.select.mockReturnValueOnce({ from: roleFromMock });

    // Mock workflow: EMPLOYEE sequence for the requester
    mockWorkflowService.getInitiatorRouteKey.mockResolvedValueOnce("EMPLOYEE");
    mockWorkflowService.getApprovalSequenceForInitiator.mockReturnValueOnce([
      "PENDING_MANAGER",
      "PENDING_HR",
      "PENDING_FINANCE",
      "PENDING_CEO",
      "APPROVED",
    ]);
    mockWorkflowService.getNextApproverIdForStatus.mockResolvedValueOnce(
      "hr-1",
    );
    mockWorkflowService.getApproverForStatus.mockReturnValueOnce("HOD_HR");

    // 3) tx.update().set().where().returning()
    mockDb.update.mockReturnValueOnce({
      set: mock(() => ({
        where: mock(() => ({
          returning: mock(() =>
            Promise.resolve([
              { id: "trip-200", status: "PENDING_HR", version: 1 },
            ]),
          ),
        })),
      })),
    });

    // 4) tx.insert() — audit log
    mockDb.insert.mockReturnValueOnce({
      values: mock(() => Promise.resolve()),
    });
    // 5) tx.insert() — approval log
    mockDb.insert.mockReturnValueOnce({
      values: mock(() => Promise.resolve()),
    });

    const result = await service.transition(
      { tripId: "trip-200", action: "APPROVE" },
      "manager-1",
    );

    expect(result).toEqual(
      expect.objectContaining({ id: "trip-200", status: "PENDING_HR" }),
    );
    expect(mockWorkflowService.getNextTripApprover).toHaveBeenCalled();
  });

  it("APPROVE should advance CEO trip from PENDING_FINANCE to APPROVED (skips PENDING_CEO)", async () => {
    // Fetch trip at PENDING_FINANCE, requested by CEO
    const tripLimitMock = mock(() =>
      Promise.resolve([
        {
          id: "trip-ceo-2",
          status: "PENDING_FINANCE",
          requesterId: "ceo-1",
          currentApproverId: "finance-1",
          currentApproverRole: "HOD_FINANCE",
          requesterPositionId: "pos-ceo",
          version: 2,
          city: "London",
          country: "UK",
        },
      ]),
    );
    const tripWhereMock = mock(() => ({
      limit: tripLimitMock,
      // biome-ignore lint/suspicious/noThenProperty: mock object
      then: (resolve: any) => tripLimitMock().then(resolve),
    }));
    const tripFromMock = mock(() => ({ where: tripWhereMock }));
    mockDb.select.mockReturnValueOnce({ from: tripFromMock });

    // Actor is FINANCE
    const roleLimitMock = mock(() =>
      Promise.resolve([{ role: "HOD_FINANCE" }]),
    );
    const roleWhereMock = mock(() => ({ limit: roleLimitMock }));
    const roleInnerJoinMock = mock(() => ({ where: roleWhereMock }));
    const roleFromMock = mock(() => ({ innerJoin: roleInnerJoinMock }));
    mockDb.select.mockReturnValueOnce({ from: roleFromMock });

    // CEO sequence: PENDING_HR → PENDING_FINANCE → APPROVED (no PENDING_CEO!)
    mockWorkflowService.getInitiatorRouteKey.mockResolvedValueOnce("CEO");
    mockWorkflowService.getApprovalSequenceForInitiator.mockReturnValueOnce([
      "PENDING_HR",
      "PENDING_FINANCE",
      "APPROVED",
    ]);
    mockWorkflowService.getNextApproverIdForStatus.mockResolvedValueOnce(null);
    mockWorkflowService.getApproverForStatus.mockReturnValueOnce(null);

    mockDb.update.mockReturnValueOnce({
      set: mock(() => ({
        where: mock(() => ({
          returning: mock(() =>
            Promise.resolve([
              { id: "trip-ceo-2", status: "APPROVED", version: 3 },
            ]),
          ),
        })),
      })),
    });

    mockDb.insert.mockReturnValueOnce({
      values: mock(() => Promise.resolve()),
    });
    mockDb.insert.mockReturnValueOnce({
      values: mock(() => Promise.resolve()),
    });

    const result = await service.transition(
      { tripId: "trip-ceo-2", action: "APPROVE" },
      "finance-1",
    );

    expect(result).toEqual(
      expect.objectContaining({ id: "trip-ceo-2", status: "APPROVED" }),
    );
  });

  // --- Transition: REJECT ---

  it("REJECT should set status to REJECTED", async () => {
    const tripLimitMock = mock(() =>
      Promise.resolve([
        {
          id: "trip-300",
          status: "PENDING_HR",
          requesterId: "user-1",
          currentApproverId: "hr-1",
          currentApproverRole: "HOD_HR",
          requesterPositionId: "pos-1",
          version: 1,
          city: "Doha",
          country: "Qatar",
        },
      ]),
    );
    const tripWhereMock = mock(() => ({
      limit: tripLimitMock,
      // biome-ignore lint/suspicious/noThenProperty: mock object
      then: (resolve: any) => tripLimitMock().then(resolve),
    }));
    const tripFromMock = mock(() => ({ where: tripWhereMock }));
    mockDb.select.mockReturnValueOnce({ from: tripFromMock });

    const roleLimitMock = mock(() => Promise.resolve([{ role: "HOD_HR" }]));
    const roleWhereMock = mock(() => ({ limit: roleLimitMock }));
    const roleInnerJoinMock = mock(() => ({ where: roleWhereMock }));
    const roleFromMock = mock(() => ({ innerJoin: roleInnerJoinMock }));
    mockDb.select.mockReturnValueOnce({ from: roleFromMock });

    mockWorkflowService.getNextApproverIdForStatus.mockResolvedValueOnce(null);
    mockWorkflowService.getApproverForStatus.mockReturnValueOnce(null);

    mockDb.update.mockReturnValueOnce({
      set: mock(() => ({
        where: mock(() => ({
          returning: mock(() =>
            Promise.resolve([
              { id: "trip-300", status: "REJECTED", version: 2 },
            ]),
          ),
        })),
      })),
    });

    mockDb.insert.mockReturnValueOnce({
      values: mock(() => Promise.resolve()),
    });
    mockDb.insert.mockReturnValueOnce({
      values: mock(() => Promise.resolve()),
    });

    const result = await service.transition(
      { tripId: "trip-300", action: "REJECT", comment: "Not justified" },
      "hr-1",
    );

    expect(result).toEqual(
      expect.objectContaining({ id: "trip-300", status: "REJECTED" }),
    );
  });

  // --- Transition: CANCEL ---

  it("CANCEL should set status to CANCELLED when requester cancels", async () => {
    const tripLimitMock = mock(() =>
      Promise.resolve([
        {
          id: "trip-400",
          status: "PENDING_MANAGER",
          requesterId: "user-1",
          currentApproverId: "manager-1",
          currentApproverRole: "MANAGER",
          requesterPositionId: "pos-1",
          version: 0,
          city: "Paris",
          country: "France",
        },
      ]),
    );
    const tripWhereMock = mock(() => ({
      limit: tripLimitMock,
      // biome-ignore lint/suspicious/noThenProperty: mock object
      then: (resolve: any) => tripLimitMock().then(resolve),
    }));
    const tripFromMock = mock(() => ({ where: tripWhereMock }));
    mockDb.select.mockReturnValueOnce({ from: tripFromMock });

    const roleLimitMock = mock(() =>
      Promise.resolve([
        {
          role: "EMPLOYEE",
          positionRole: "EMPLOYEE",
          positionId: "pos-emp",
          departmentId: "dep-1",
          reportsToPositionId: null,
        },
      ]),
    );
    const roleWhereMock = mock(() => ({ limit: roleLimitMock }));
    const roleInnerJoinMock = mock(() => ({ where: roleWhereMock }));
    const roleFromMock = mock(() => ({ innerJoin: roleInnerJoinMock }));
    mockDb.select.mockReturnValueOnce({ from: roleFromMock });

    mockWorkflowService.getNextApproverIdForStatus.mockResolvedValueOnce(null);
    mockWorkflowService.getApproverForStatus.mockReturnValueOnce(null);

    mockDb.update.mockReturnValueOnce({
      set: mock(() => ({
        where: mock(() => ({
          returning: mock(() =>
            Promise.resolve([
              { id: "trip-400", status: "CANCELLED", version: 1 },
            ]),
          ),
        })),
      })),
    });

    mockDb.insert.mockReturnValueOnce({
      values: mock(() => Promise.resolve()),
    });
    mockDb.insert.mockReturnValueOnce({
      values: mock(() => Promise.resolve()),
    });

    const result = await service.transition(
      { tripId: "trip-400", action: "CANCEL" },
      "user-1", // requester cancels their own trip
    );

    expect(result).toEqual(
      expect.objectContaining({ id: "trip-400", status: "CANCELLED" }),
    );
  });

  // --- Authorization ---

  it("APPROVE should throw FORBIDDEN when actor is not the assigned approver", async () => {
    const tripLimitMock = mock(() =>
      Promise.resolve([
        {
          id: "trip-500",
          status: "PENDING_MANAGER",
          requesterId: "user-1",
          requesterPositionId: "pos-1",
          currentApproverId: "manager-1",
          currentApproverRole: "MANAGER",
          version: 0,
          city: "Doha",
          country: "Qatar",
        },
      ]),
    );
    const tripWhereMock = mock(() => ({
      limit: tripLimitMock,
      // biome-ignore lint/suspicious/noThenProperty: mock object
      then: (resolve: any) => tripLimitMock().then(resolve),
    }));
    const tripFromMock = mock(() => ({ where: tripWhereMock }));
    mockDb.select.mockReturnValueOnce({ from: tripFromMock });

    // Actor is a random EMPLOYEE, not the assigned approver
    const roleLimitMock = mock(() =>
      Promise.resolve([
        {
          role: "EMPLOYEE",
          positionRole: "EMPLOYEE",
          positionId: "pos-emp",
          departmentId: "dep-1",
          reportsToPositionId: null,
        },
      ]),
    );
    const roleWhereMock = mock(() => ({ limit: roleLimitMock }));
    const roleInnerJoinMock = mock(() => ({ where: roleWhereMock }));
    const roleFromMock = mock(() => ({ innerJoin: roleInnerJoinMock }));
    mockDb.select.mockReturnValueOnce({ from: roleFromMock });
    mockDb.select.mockReturnValueOnce({ from: roleFromMock });

    mockWorkflowService.canActorTransition.mockResolvedValueOnce(false);

    await expect(
      service.transition(
        { tripId: "trip-500", action: "APPROVE" },
        "random-user", // not the assigned approver
      ),
    ).rejects.toThrow("Not authorized to perform this action");
  });
});
