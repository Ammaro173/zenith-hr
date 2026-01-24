import { describe, expect, it, mock } from "bun:test";
import { createSeparationsService } from "./separations.service";

interface MockDb {
  insert: ReturnType<typeof mock>;
  select: ReturnType<typeof mock>;
  update: ReturnType<typeof mock>;
  transaction: ReturnType<typeof mock>;
  query: Record<string, unknown>;
}

function createMockStorage() {
  return {
    upload: mock(() => Promise.resolve("s3://bucket/key")),
    getPresignedUrl: mock(() =>
      Promise.resolve("https://example.com/presigned"),
    ),
  };
}

describe("SeparationsService", () => {
  it("create() sets PENDING_MANAGER when requester has manager", async () => {
    const storage = createMockStorage();

    const tx: Record<string, unknown> = {};
    const mockDb: MockDb = {
      insert: mock(() => ({
        values: mock(() => ({
          returning: mock(() =>
            Promise.resolve([{ id: "sep-1", status: "PENDING_MANAGER" }]),
          ),
        })),
      })),
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => Promise.resolve([{ id: "sep-1" }])),
          })),
        })),
      })),
      select: mock(() => ({
        from: mock(() => ({
          where: mock(() => ({
            limit: mock(() =>
              Promise.resolve([
                { id: "emp-1", role: "REQUESTER", name: "Emp" },
              ]),
            ),
          })),
        })),
      })),
      transaction: mock(async (cb: (t: unknown) => Promise<unknown>) => {
        // tx.select for manager lookup
        (tx as { select?: unknown }).select = mock(() => ({
          from: mock(() => ({
            where: mock(() => ({
              limit: mock(() => Promise.resolve([{ managerId: "mgr-1" }])),
            })),
          })),
        }));
        // tx.insert used for separationRequest insert + auditLog insert + outbox insert
        (tx as { insert?: unknown }).insert = mock(() => ({
          values: mock(() => ({
            returning: mock(() =>
              Promise.resolve([{ id: "sep-1", status: "PENDING_MANAGER" }]),
            ),
            onConflictDoNothing: mock(() => Promise.resolve()),
          })),
        }));
        return await cb(tx);
      }),
      query: {},
    };

    const service = createSeparationsService(
      mockDb as unknown as any,
      storage as any,
    );

    const result = await service.create(
      {
        type: "RESIGNATION",
        reason: "Moving to another company",
        lastWorkingDay: new Date("2026-01-31"),
        noticePeriodWaived: false,
      },
      "emp-1",
    );

    expect(result?.status).toBe("PENDING_MANAGER");
  });

  it("approveByHr() clones templates into checklist + starts clearance", async () => {
    const storage = createMockStorage();

    const tx: Record<string, unknown> = {};
    let selectCall = 0;

    const mockDb: MockDb = {
      select: mock(() => ({
        from: mock(() => ({
          where: mock(() => ({
            limit: mock(() => {
              selectCall++;
              if (selectCall === 1) {
                // getActorRole(actorId) => HR
                return Promise.resolve([{ role: "HR" }]);
              }
              return Promise.resolve([]);
            }),
          })),
        })),
      })),
      insert: mock(() => ({
        values: mock(() => Promise.resolve(undefined)),
        onConflictDoNothing: mock(() => ({
          returning: mock(() => Promise.resolve([])),
        })),
      })),
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() =>
              Promise.resolve([
                { id: "sep-1", status: "CLEARANCE_IN_PROGRESS" },
              ]),
            ),
          })),
        })),
      })),
      transaction: mock(async (cb: (t: unknown) => Promise<unknown>) => {
        let txSelectCall = 0;
        (tx as any).select = mock(() => ({
          from: mock(() => ({
            where: mock(() => {
              txSelectCall++;
              if (txSelectCall === 1) {
                return {
                  limit: mock(() =>
                    Promise.resolve([
                      {
                        id: "sep-1",
                        employeeId: "emp-1",
                        status: "PENDING_HR",
                        lastWorkingDay: "2026-01-31",
                        hrOwnerId: null,
                      },
                    ]),
                  ),
                };
              }

              return {
                orderBy: mock(() =>
                  Promise.resolve([
                    {
                      id: "tpl-1",
                      lane: "IT",
                      title: "Disable email",
                      description: null,
                      required: true,
                      defaultDueOffsetDays: 3,
                      order: 0,
                      active: true,
                    },
                  ]),
                ),
              };
            }),
          })),
        }));

        (tx as any).insert = mock(() => ({
          values: mock(() => ({
            returning: mock(() =>
              Promise.resolve([
                { id: "sep-1", status: "CLEARANCE_IN_PROGRESS" },
              ]),
            ),
            onConflictDoNothing: mock(() => Promise.resolve()),
          })),
        }));

        (tx as any).update = mockDb.update;

        return await cb(tx);
      }),
      query: {},
    };

    const service = createSeparationsService(
      mockDb as unknown as any,
      storage as any,
    );

    const result = await service.approveByHr({ separationId: "sep-1" }, "hr-1");
    expect(result?.status).toBe("CLEARANCE_IN_PROGRESS");
  });

  it("updateChecklist() requires remarks when rejecting", async () => {
    const storage = createMockStorage();

    const mockDb: MockDb = {
      select: mock(() => ({
        from: mock(() => ({
          where: mock(() => ({
            limit: mock(() => Promise.resolve([{ role: "IT" }])),
          })),
        })),
      })),
      insert: mock(() => ({
        values: mock(() => Promise.resolve(undefined)),
      })),
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() =>
              Promise.resolve([{ id: "chk-1", status: "REJECTED" }]),
            ),
          })),
        })),
      })),
      transaction: mock(
        async (cb: (t: unknown) => Promise<unknown>) => await cb(mockDb),
      ),
      query: {},
    };

    // checklist select call should return the checklist item after role lookup.
    let selectCall = 0;
    mockDb.select.mockImplementation(() => ({
      from: mock(() => ({
        where: mock(() => ({
          limit: mock(() => {
            selectCall++;
            if (selectCall === 1) {
              return Promise.resolve([{ role: "IT" }]);
            }
            return Promise.resolve([
              {
                id: "chk-1",
                separationId: "sep-1",
                lane: "IT",
                title: "Disable email",
                required: true,
                status: "PENDING",
              },
            ]);
          }),
        })),
      })),
    }));

    const service = createSeparationsService(
      mockDb as unknown as any,
      storage as any,
    );

    await expect(
      service.updateChecklist(
        { checklistId: "chk-1", status: "REJECTED" },
        "it-1",
      ),
    ).rejects.toThrow("Remarks are required");
  });

  it("updateChecklist() forbids acting on a lane you don't own", async () => {
    const storage = createMockStorage();

    const mockDb: MockDb = {
      select: mock(() => ({
        from: mock(() => ({
          where: mock(() => ({
            limit: mock(() => Promise.resolve([])),
          })),
        })),
      })),
      insert: mock(() => ({
        values: mock(() => Promise.resolve(undefined)),
      })),
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => Promise.resolve([])),
          })),
        })),
      })),
      transaction: mock(
        async (cb: (t: unknown) => Promise<unknown>) => await cb(mockDb),
      ),
      query: {},
    };

    let selectCall = 0;
    mockDb.select.mockImplementation(() => ({
      from: mock((_table: unknown) => ({
        where: mock(() => {
          const builder = {
            limit: mock(() => {
              selectCall++;
              if (selectCall === 1) {
                // getActorRole => FINANCE
                return Promise.resolve([{ role: "FINANCE" }]);
              }
              if (selectCall === 2) {
                // checklist lookup => IT lane
                return Promise.resolve([
                  {
                    id: "chk-1",
                    separationId: "sep-1",
                    lane: "IT",
                    title: "Disable email",
                    required: true,
                    status: "PENDING",
                  },
                ]);
              }
              // userClearanceLane membership lookup => none
              return Promise.resolve([]);
            }),
          };

          // Some queries `await ...where(...)` directly (no `.limit()`).
          return {
            ...builder,
            // biome-ignore lint/suspicious/noThenProperty: mock
            then: (onFulfilled: (value: unknown) => unknown) =>
              Promise.resolve([]).then(onFulfilled),
          };
        }),
      })),
    }));

    const service = createSeparationsService(
      mockDb as unknown as any,
      storage as any,
    );

    await expect(
      service.updateChecklist(
        { checklistId: "chk-1", status: "CLEARED", remarks: "ok" },
        "finance-1",
      ),
    ).rejects.toThrow("Not authorized for this lane");
  });
});
