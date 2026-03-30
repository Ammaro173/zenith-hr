import { describe, expect, it, mock } from "bun:test";
import { AppError } from "../../shared/errors";
import { createSeparationsService } from "./separations.service";

interface MockDb {
  insert: ReturnType<typeof mock>;
  query: Record<string, unknown>;
  select: ReturnType<typeof mock>;
  transaction: ReturnType<typeof mock>;
  update: ReturnType<typeof mock>;
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
      select: mock(() => {
        const qb: any = {
          from: mock(() => qb),
          innerJoin: mock(() => qb),
          where: mock(() => qb),
          limit: mock(() =>
            Promise.resolve([{ role: "EMPLOYEE", positionRole: "EMPLOYEE" }]),
          ),
        };
        return qb;
      }),
      transaction: mock(async (cb: (t: unknown) => Promise<unknown>) => {
        let txSelectCall = 0;
        // tx.select: call 1 → getActivePositionId, call 2 → getActivePositionOccupant
        (tx as { select?: unknown }).select = mock(() => ({
          from: mock(() => ({
            innerJoin: mock(() => ({
              where: mock(() => ({
                limit: mock(() => {
                  txSelectCall++;
                  if (txSelectCall === 2) {
                    return Promise.resolve([
                      {
                        positionId: "pos-emp",
                        positionRole: "EMPLOYEE",
                        departmentId: "dept-1",
                        reportsToPositionId: "pos-mgr",
                      },
                    ]);
                  }
                  return Promise.resolve([]);
                }),
              })),
            })),
            where: mock(() => ({
              limit: mock(() => {
                txSelectCall++;
                if (txSelectCall === 1) {
                  return Promise.resolve([{ id: "emp-1" }]);
                }
                if (txSelectCall === 3) {
                  return Promise.resolve([{ userId: "mgr-1" }]);
                }
                return Promise.resolve([]);
              }),
            })),
          })),
        }));
        // tx.execute for getParentPositionId (uses raw SQL)
        (tx as { execute?: unknown }).execute = mock(() =>
          Promise.resolve({ rows: [{ parent_position_id: "pos-mgr" }] }),
        );
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

  it("create() forbids TERMINATION and END_OF_CONTRACT for EMPLOYEE role", async () => {
    const storage = createMockStorage();
    const mockDb: MockDb = {
      insert: mock(() => ({})),
      update: mock(() => ({})),
      select: mock(() => {
        const qb: unknown = {
          from: mock(() => qb),
          innerJoin: mock(() => qb),
          where: mock(() => qb),
          limit: mock(() =>
            Promise.resolve([{ role: "EMPLOYEE", positionRole: "EMPLOYEE" }]),
          ),
        };
        return qb;
      }),
      transaction: mock(async (cb: (t: unknown) => Promise<unknown>) => {
        const tx: Record<string, unknown> = {};
        return await cb(tx);
      }),
      query: {},
    };

    const service = createSeparationsService(
      mockDb as unknown as any,
      storage as any,
    );

    await expect(
      service.create(
        {
          type: "TERMINATION",
          reason: "Performance — initiated by HR",
          lastWorkingDay: new Date("2026-01-31"),
          noticePeriodWaived: false,
        },
        "emp-1",
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      service.create(
        {
          type: "END_OF_CONTRACT",
          reason: "Contract ended naturally",
          lastWorkingDay: new Date("2026-01-31"),
          noticePeriodWaived: false,
        },
        "emp-1",
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("create() uses subject as employeeId and actor as audit performedBy when subjectUserId set", async () => {
    const storage = createMockStorage();
    let separationEmployeeId: string | undefined;
    let auditPerformedBy: string | undefined;

    const tx: Record<string, unknown> = {};
    let txSelectCall = 0;
    let txExecuteCall = 0;

    const mockDb: MockDb = {
      insert: mock(() => ({ values: mock(() => ({})) })),
      update: mock(() => ({})),
      select: mock(() => {
        const qb: unknown = {
          from: mock(() => qb),
          innerJoin: mock(() => qb),
          where: mock(() => qb),
          limit: mock(() =>
            Promise.resolve([
              { id: "mgr-1", name: "Manager", role: "MANAGER" },
            ]),
          ),
        };
        return qb;
      }),
      transaction: mock(async (cb: (t: unknown) => Promise<unknown>) => {
        (tx as { select?: unknown }).select = mock(() => ({
          from: mock(() => ({
            innerJoin: mock(() => ({
              where: mock(() => ({
                limit: mock(() => {
                  txSelectCall++;
                  if (txSelectCall === 2) {
                    return Promise.resolve([
                      {
                        positionId: "pos-mgr-anchor",
                        positionRole: "MANAGER",
                        departmentId: "dept-1",
                        reportsToPositionId: "root",
                      },
                    ]);
                  }
                  if (txSelectCall === 3) {
                    return Promise.resolve([
                      {
                        positionId: "pos-sub",
                        positionRole: "EMPLOYEE",
                        departmentId: "dept-1",
                        reportsToPositionId: "pos-mgr",
                      },
                    ]);
                  }
                  return Promise.resolve([]);
                }),
              })),
            })),
            where: mock(() => ({
              limit: mock(() => {
                txSelectCall++;
                if (txSelectCall === 1) {
                  return Promise.resolve([{ id: "sub-1" }]);
                }
                if (txSelectCall === 4) {
                  return Promise.resolve([{ userId: "mgr-slot" }]);
                }
                return Promise.resolve([]);
              }),
            })),
          })),
        }));
        (tx as { execute?: unknown }).execute = mock(() => {
          txExecuteCall++;
          if (txExecuteCall === 1) {
            return Promise.resolve({ rows: [{ id: "sub-1" }] });
          }
          return Promise.resolve({ rows: [{ parent_position_id: "pos-mgr" }] });
        });
        (tx as { insert?: unknown }).insert = mock(() => ({
          values: mock((vals: Record<string, unknown>) => {
            if (
              vals.entityType === "SEPARATION" &&
              vals.action === "CREATE_REQUEST"
            ) {
              auditPerformedBy = vals.performedBy as string;
            } else if (vals.type != null && vals.employeeId != null) {
              separationEmployeeId = vals.employeeId as string;
            }
            return {
              returning: mock(() => {
                if (vals.entityType === "SEPARATION") {
                  return Promise.resolve([]);
                }
                return Promise.resolve([
                  { id: "sep-1", status: "PENDING_MANAGER" },
                ]);
              }),
              onConflictDoNothing: mock(() => Promise.resolve()),
            };
          }),
        }));
        return await cb(tx);
      }),
      query: {},
    };

    const service = createSeparationsService(
      mockDb as unknown as Parameters<typeof createSeparationsService>[0],
      storage as Parameters<typeof createSeparationsService>[1],
    );

    await service.create(
      {
        type: "TERMINATION",
        reason: "Policy violation — initiated by manager",
        lastWorkingDay: new Date("2026-01-31"),
        noticePeriodWaived: false,
        subjectUserId: "sub-1",
      },
      "mgr-1",
    );

    expect(separationEmployeeId).toBe("sub-1");
    expect(auditPerformedBy).toBe("mgr-1");
  });

  it("create() forbids manager submitting for employee outside scope", async () => {
    const storage = createMockStorage();
    const tx: Record<string, unknown> = {};
    let txSelectCall = 0;

    const mockDb: MockDb = {
      insert: mock(() => ({})),
      update: mock(() => ({})),
      select: mock(() => {
        const qb: unknown = {
          from: mock(() => qb),
          innerJoin: mock(() => qb),
          where: mock(() => qb),
          limit: mock(() =>
            Promise.resolve([
              { id: "mgr-1", name: "Manager", role: "MANAGER" },
            ]),
          ),
        };
        return qb;
      }),
      transaction: mock(async (cb: (t: unknown) => Promise<unknown>) => {
        (tx as { select?: unknown }).select = mock(() => ({
          from: mock(() => ({
            innerJoin: mock(() => ({
              where: mock(() => ({
                limit: mock(() => {
                  txSelectCall++;
                  if (txSelectCall === 2) {
                    return Promise.resolve([
                      {
                        positionId: "pos-mgr",
                        positionRole: "MANAGER",
                        departmentId: "dept-1",
                        reportsToPositionId: "root",
                      },
                    ]);
                  }
                  return Promise.resolve([]);
                }),
              })),
            })),
            where: mock(() => ({
              limit: mock(() => {
                txSelectCall++;
                if (txSelectCall === 1) {
                  return Promise.resolve([{ id: "stranger" }]);
                }
                return Promise.resolve([]);
              }),
            })),
          })),
        }));
        (tx as { execute?: unknown }).execute = mock(() =>
          Promise.resolve({ rows: [] }),
        );
        return await cb(tx);
      }),
      query: {},
    };

    const service = createSeparationsService(
      mockDb as unknown as Parameters<typeof createSeparationsService>[0],
      storage as Parameters<typeof createSeparationsService>[1],
    );

    await expect(
      service.create(
        {
          type: "RESIGNATION",
          reason: "Not in reporting line",
          lastWorkingDay: new Date("2026-01-31"),
          noticePeriodWaived: false,
          subjectUserId: "stranger",
        },
        "mgr-1",
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("approveByHr() clones templates into checklist + starts clearance", async () => {
    const storage = createMockStorage();

    const tx: Record<string, unknown> = {};
    let selectCall = 0;

    const mockDb: MockDb = {
      select: mock(() => {
        const qb: any = {
          from: mock(() => qb),
          innerJoin: mock(() => qb),
          where: mock(() => qb),
          limit: mock(() => {
            selectCall++;
            if (selectCall === 1) {
              return Promise.resolve([{ role: "HOD_HR" }]);
            }
            return Promise.resolve([]);
          }),
        };
        return qb;
      }),
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
      query: {
        separationRequest: {
          findFirst: mock(() =>
            Promise.resolve({
              id: "sep-1",
              employeeId: "it-1",
              managerPositionId: "pos-mgr",
              status: "CLEARANCE_IN_PROGRESS",
              employee: { id: "it-1", name: "IT" },
            }),
          ),
        },
      },
    };

    let selectCall = 0;
    mockDb.select.mockImplementation(() => {
      const qb: any = {
        from: mock(() => qb),
        innerJoin: mock(() => qb),
        where: mock(() => qb),
        limit: mock(() => {
          selectCall++;
          if (selectCall === 1) {
            return Promise.resolve([
              {
                id: "chk-1",
                separationId: "sep-1",
                lane: "HOD_IT",
                title: "Disable email",
                required: true,
                status: "PENDING",
              },
            ]);
          }
          return Promise.resolve([{ role: "HOD_IT" }]);
        }),
      };
      return qb;
    });

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
      query: {
        separationRequest: {
          findFirst: mock(() =>
            Promise.resolve({
              id: "sep-1",
              employeeId: "finance-1",
              managerPositionId: "pos-mgr",
              status: "CLEARANCE_IN_PROGRESS",
              employee: { id: "finance-1", name: "Fin" },
            }),
          ),
        },
      },
    };

    let selectCall = 0;
    mockDb.select.mockImplementation(() => {
      const qb: any = {
        from: mock((_table: unknown) => qb),
        innerJoin: mock(() => qb),
        where: mock(() => {
          const builder = {
            limit: mock(() => {
              selectCall++;
              if (selectCall === 1) {
                return Promise.resolve([
                  {
                    id: "chk-1",
                    separationId: "sep-1",
                    lane: "HOD_IT",
                    title: "Disable email",
                    required: true,
                    status: "PENDING",
                  },
                ]);
              }
              if (selectCall === 2) {
                return Promise.resolve([{ role: "HOD_FINANCE" }]);
              }
              return Promise.resolve([]);
            }),
          };

          return {
            ...builder,
            // biome-ignore lint/suspicious/noThenProperty: mock
            then: (onFulfilled: (value: unknown) => unknown) =>
              Promise.resolve([]).then(onFulfilled),
          };
        }),
      };
      return qb;
    });

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

  it("getForViewer() forbids unrelated users", async () => {
    const storage = createMockStorage();
    const sepRow = {
      id: "sep-1",
      employeeId: "emp-1",
      managerPositionId: "pos-mgr",
      status: "PENDING_MANAGER",
      employee: { id: "emp-1", name: "Emp" },
    };

    let _selectCall = 0;
    const mockDb: MockDb = {
      insert: mock(() => ({ values: mock(() => Promise.resolve(undefined)) })),
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => ({ returning: mock(() => Promise.resolve([])) })),
        })),
      })),
      select: mock(() => {
        const qb: any = {
          from: mock(() => qb),
          innerJoin: mock(() => qb),
          where: mock(() => qb),
          limit: mock(() => {
            _selectCall++;
            if (_selectCall === 1) {
              return Promise.resolve([{ role: "EMPLOYEE" }]);
            }
            if (_selectCall === 2 || _selectCall === 4) {
              return Promise.resolve([{ userId: "real-mgr" }]);
            }
            return Promise.resolve([]);
          }),
        };
        return qb;
      }),
      transaction: mock(
        async (cb: (t: unknown) => Promise<unknown>) => await cb(mockDb),
      ),
      query: {
        separationRequest: {
          findFirst: mock(() => Promise.resolve(sepRow)),
        },
      },
    };

    (mockDb as any).execute = mock(() =>
      Promise.resolve({ rows: [{ parent_position_id: null }] }),
    );

    const service = createSeparationsService(
      mockDb as unknown as Parameters<typeof createSeparationsService>[0],
      storage as any,
    );

    await expect(service.getForViewer("sep-1", "stranger-1")).rejects.toThrow(
      AppError,
    );
  });

  it("getForViewer() sets canApproveAsManager for manager slot occupant with HOD_IT precedence (even with EMPLOYEE assignment)", async () => {
    const storage = createMockStorage();
    const fullSep = {
      id: "sep-1",
      employeeId: "emp-1",
      managerPositionId: "pos-mgr",
      status: "PENDING_MANAGER",
      checklistItems: [],
      documents: [],
      employee: { id: "emp-1", name: "Emp" },
    };

    let selectBuilderCall = 0;
    let limitCall = 0;
    const mockDb: MockDb = {
      insert: mock(() => ({ values: mock(() => Promise.resolve(undefined)) })),
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => ({ returning: mock(() => Promise.resolve([])) })),
        })),
      })),
      select: mock(() => {
        selectBuilderCall++;
        // 4th select: `getUserLanes` membership query has no `.limit()`.
        if (selectBuilderCall === 4) {
          return {
            from: mock(() => ({
              where: mock(() => Promise.resolve([])),
            })),
          };
        }
        const qb: any = {
          from: mock(() => qb),
          innerJoin: mock(() => qb),
          where: mock(() => qb),
          limit: mock(() => {
            limitCall++;
            if (limitCall === 1) {
              // Simulate a dual-assignment user: EMPLOYEE + HOD_IT.
              return Promise.resolve([
                { role: "EMPLOYEE" },
                { role: "HOD_IT" },
              ]);
            }
            return Promise.resolve([{ userId: "hod-it-1" }]);
          }),
        };
        return qb;
      }),
      transaction: mock(
        async (cb: (t: unknown) => Promise<unknown>) => await cb(mockDb),
      ),
      query: {
        separationRequest: {
          findFirst: mock(() => Promise.resolve(fullSep)),
        },
      },
    };

    (mockDb as any).execute = mock(() =>
      Promise.resolve({ rows: [{ parent_position_id: null }] }),
    );

    const service = createSeparationsService(
      mockDb as unknown as Parameters<typeof createSeparationsService>[0],
      storage as any,
    );

    const result = await service.getForViewer("sep-1", "hod-it-1");
    expect(result.viewer.canApproveAsManager).toBe(true);
    expect(result.viewer.canRejectAsManager).toBe(true);
    expect(result.viewer.canApproveAsHr).toBe(false);
    expect(result.viewer.clearanceActLanes).toContain("HOD_IT");
    expect(result.viewer.canAddClearanceItems).toBe(false);
  });

  it("getForViewer() forbids HOD_IT who is not the slot occupant from viewing", async () => {
    const storage = createMockStorage();
    const fullSep = {
      id: "sep-1",
      employeeId: "emp-1",
      managerPositionId: "pos-mgr",
      status: "PENDING_MANAGER",
      checklistItems: [],
      documents: [],
      employee: { id: "emp-1", name: "Emp" },
    };

    let selectCall = 0;
    const mockDb: MockDb = {
      insert: mock(() => ({ values: mock(() => Promise.resolve(undefined)) })),
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => ({ returning: mock(() => Promise.resolve([])) })),
        })),
      })),
      select: mock(() => {
        const qb: any = {
          from: mock(() => qb),
          innerJoin: mock(() => qb),
          where: mock(() => qb),
          limit: mock(() => {
            selectCall++;
            if (selectCall === 1) {
              return Promise.resolve([{ role: "HOD_IT" }]);
            }
            if (selectCall === 2 || selectCall === 4) {
              return Promise.resolve([{ userId: "other-mgr" }]);
            }
            return Promise.resolve([]);
          }),
        };
        return qb;
      }),
      transaction: mock(
        async (cb: (t: unknown) => Promise<unknown>) => await cb(mockDb),
      ),
      query: {
        separationRequest: {
          findFirst: mock(() => Promise.resolve(fullSep)),
        },
      },
    };

    (mockDb as any).execute = mock(() =>
      Promise.resolve({ rows: [{ parent_position_id: null }] }),
    );

    const service = createSeparationsService(
      mockDb as unknown as Parameters<typeof createSeparationsService>[0],
      storage as any,
    );

    await expect(service.getForViewer("sep-1", "hod-it-1")).rejects.toThrow(
      AppError,
    );
  });

  it("getForViewer() exposes HR approve on PENDING_MANAGER for HOD_HR", async () => {
    const storage = createMockStorage();
    const fullSep = {
      id: "sep-1",
      employeeId: "emp-1",
      managerPositionId: "pos-mgr",
      status: "PENDING_MANAGER",
      checklistItems: [],
      documents: [],
      employee: { id: "emp-1", name: "Emp" },
    };

    let selectCall = 0;
    const mockDb: MockDb = {
      insert: mock(() => ({ values: mock(() => Promise.resolve(undefined)) })),
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => ({ returning: mock(() => Promise.resolve([])) })),
        })),
      })),
      select: mock(() => {
        const qb: any = {
          from: mock(() => qb),
          innerJoin: mock(() => qb),
          where: mock(() => qb),
          limit: mock(() => {
            selectCall++;
            if (selectCall === 1) {
              return Promise.resolve([{ role: "HOD_HR" }]);
            }
            return Promise.resolve([{ userId: "someone-else" }]);
          }),
        };
        return qb;
      }),
      transaction: mock(
        async (cb: (t: unknown) => Promise<unknown>) => await cb(mockDb),
      ),
      query: {
        separationRequest: {
          findFirst: mock(() => Promise.resolve(fullSep)),
        },
      },
    };

    (mockDb as any).execute = mock(() =>
      Promise.resolve({ rows: [{ parent_position_id: null }] }),
    );

    const service = createSeparationsService(
      mockDb as unknown as Parameters<typeof createSeparationsService>[0],
      storage as any,
    );

    const result = await service.getForViewer("sep-1", "hr-1");
    expect(result.viewer.canApproveAsHr).toBe(true);
    expect(result.viewer.canRejectAsHr).toBe(false);
    expect(result.viewer.canApproveAsManager).toBe(true);
    expect(result.viewer.canAddClearanceItems).toBe(true);
    expect(result.viewer.clearanceActLanes.length).toBeGreaterThan(3);
  });

  it("getForViewer() allows HR reject only in PENDING_HR", async () => {
    const storage = createMockStorage();
    const fullSep = {
      id: "sep-1",
      employeeId: "emp-1",
      managerPositionId: "pos-mgr",
      status: "PENDING_HR",
      checklistItems: [],
      documents: [],
      employee: { id: "emp-1", name: "Emp" },
    };

    let selectCall = 0;
    const mockDb: MockDb = {
      insert: mock(() => ({ values: mock(() => Promise.resolve(undefined)) })),
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => ({ returning: mock(() => Promise.resolve([])) })),
        })),
      })),
      select: mock(() => {
        const qb: any = {
          from: mock(() => qb),
          innerJoin: mock(() => qb),
          where: mock(() => qb),
          limit: mock(() => {
            selectCall++;
            if (selectCall === 1) {
              return Promise.resolve([{ role: "HOD_HR" }]);
            }
            return Promise.resolve([{ userId: "other-mgr" }]);
          }),
        };
        return qb;
      }),
      transaction: mock(
        async (cb: (t: unknown) => Promise<unknown>) => await cb(mockDb),
      ),
      query: {
        separationRequest: {
          findFirst: mock(() => Promise.resolve(fullSep)),
        },
      },
    };

    (mockDb as any).execute = mock(() =>
      Promise.resolve({ rows: [{ parent_position_id: null }] }),
    );

    const service = createSeparationsService(
      mockDb as unknown as Parameters<typeof createSeparationsService>[0],
      storage as any,
    );

    const result = await service.getForViewer("sep-1", "hr-1");
    expect(result.viewer.canRejectAsHr).toBe(true);
    expect(result.viewer.canAddClearanceItems).toBe(true);
  });

  it("getForViewer() allows clearance lane actor (not employee/manager) when they hold a checklist item in that lane", async () => {
    const storage = createMockStorage();
    const clearanceSep = {
      id: "sep-clear",
      employeeId: "emp-other",
      managerPositionId: "pos-mgr",
      status: "CLEARANCE_IN_PROGRESS",
      checklistItems: [],
      documents: [],
      employee: { id: "emp-other", name: "Other" },
    };

    let selectBuilderCall = 0;
    const limitOccupantNotActor = () =>
      Promise.resolve([{ userId: "line-mgr" }]);

    const mockDb: MockDb = {
      insert: mock(() => ({ values: mock(() => Promise.resolve(undefined)) })),
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => ({ returning: mock(() => Promise.resolve([])) })),
        })),
      })),
      select: mock(() => {
        selectBuilderCall++;
        // 1 getActorRole; 2 ensure slot occupant; 3 getUserLanes (ensure); 4 checklist hit;
        // 5 computeViewer occupant; 6 getUserLanes (computeViewer).
        if (selectBuilderCall === 1) {
          return {
            from: mock(() => ({
              innerJoin: mock(() => ({
                where: mock(() => ({
                  limit: mock(() => Promise.resolve([{ role: "HOD_IT" }])),
                })),
              })),
            })),
          };
        }
        if (selectBuilderCall === 2 || selectBuilderCall === 5) {
          return {
            from: mock(() => ({
              where: mock(() => ({
                limit: mock(limitOccupantNotActor),
              })),
            })),
          };
        }
        if (selectBuilderCall === 3 || selectBuilderCall === 6) {
          return {
            from: mock(() => ({
              where: mock(() => Promise.resolve([])),
            })),
          };
        }
        if (selectBuilderCall === 4) {
          return {
            from: mock(() => ({
              where: mock(() => ({
                limit: mock(() => Promise.resolve([{ id: "chk-lane" }])),
              })),
            })),
          };
        }
        return {
          from: mock(() => ({
            where: mock(() => ({
              limit: mock(limitOccupantNotActor),
            })),
          })),
        };
      }),
      transaction: mock(
        async (cb: (t: unknown) => Promise<unknown>) => await cb(mockDb),
      ),
      query: {
        separationRequest: {
          findFirst: mock(() => Promise.resolve(clearanceSep)),
        },
      },
    };

    (mockDb as any).execute = mock(() =>
      Promise.resolve({ rows: [{ parent_position_id: null }] }),
    );

    const service = createSeparationsService(
      mockDb as unknown as Parameters<typeof createSeparationsService>[0],
      storage as any,
    );

    const result = await service.getForViewer("sep-clear", "hod-it-lane-1");
    expect(result.id).toBe("sep-clear");
    expect(result.viewer.canApproveAsManager).toBe(false);
    expect(result.viewer.clearanceActLanes).toContain("HOD_IT");
  });

  it("listEligibleSubjects() restricts EMPLOYEE to self in final query", async () => {
    const storage = createMockStorage();
    let selectBuild = 0;
    const mockDb: MockDb = {
      insert: mock(() => ({ values: mock(() => Promise.resolve(undefined)) })),
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => Promise.resolve([])),
          })),
        })),
      })),
      transaction: mock(
        async (cb: (t: unknown) => Promise<unknown>) => await cb({} as MockDb),
      ),
      query: {},
      select: mock(() => {
        selectBuild++;
        if (selectBuild === 1) {
          return {
            from: mock(() => ({
              innerJoin: mock(() => ({
                where: mock(() => ({
                  limit: mock(() => Promise.resolve([{ role: "EMPLOYEE" }])),
                })),
              })),
            })),
          };
        }
        return {
          from: mock(() => ({
            leftJoin: mock(() => ({
              where: mock(() => ({
                orderBy: mock(() => ({
                  limit: mock(() =>
                    Promise.resolve([
                      {
                        id: "self-1",
                        name: "Alex",
                        email: "a@x.com",
                        sapNo: "100",
                        departmentName: "Ops",
                      },
                    ]),
                  ),
                })),
              })),
            })),
          })),
        };
      }),
    };

    const service = createSeparationsService(
      mockDb as unknown as Parameters<typeof createSeparationsService>[0],
      storage as Parameters<typeof createSeparationsService>[1],
    );
    const rows = await service.listEligibleSubjects("self-1", { limit: 50 });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("self-1");
  });

  it("listEligibleSubjects() does not apply id filter when actor is ADMIN", async () => {
    const storage = createMockStorage();
    let selectBuild = 0;
    const mockDb: MockDb = {
      insert: mock(() => ({ values: mock(() => Promise.resolve(undefined)) })),
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => Promise.resolve([])),
          })),
        })),
      })),
      transaction: mock(
        async (cb: (t: unknown) => Promise<unknown>) => await cb({} as MockDb),
      ),
      query: {},
      select: mock(() => {
        selectBuild++;
        if (selectBuild === 1) {
          return {
            from: mock(() => ({
              innerJoin: mock(() => ({
                where: mock(() => ({
                  limit: mock(() => Promise.resolve([{ role: "ADMIN" }])),
                })),
              })),
            })),
          };
        }
        return {
          from: mock(() => ({
            leftJoin: mock(() => ({
              where: mock(() => ({
                orderBy: mock(() => ({
                  limit: mock(() =>
                    Promise.resolve([
                      {
                        id: "any-1",
                        name: "Pat",
                        email: "p@x.com",
                        sapNo: "9",
                        departmentName: null,
                      },
                    ]),
                  ),
                })),
              })),
            })),
          })),
        };
      }),
    };

    const service = createSeparationsService(
      mockDb as unknown as Parameters<typeof createSeparationsService>[0],
      storage as Parameters<typeof createSeparationsService>[1],
    );
    const rows = await service.listEligibleSubjects("admin-1", { limit: 10 });
    expect(rows[0]?.id).toBe("any-1");
  });
});
