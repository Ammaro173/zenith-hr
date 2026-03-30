import { describe, expect, it, mock } from "bun:test";
import type { DbOrTx } from "@zenith-hr/db";

import { getActorPositionInfo, getActorRole } from "./utils";

describe("shared/utils role resolution", () => {
  it("getActorRole() picks the highest-precedence role for dual assignments", async () => {
    const roleRows = [{ role: "EMPLOYEE" }, { role: "HOD_IT" }];

    const roleLimitMock = mock(() => Promise.resolve(roleRows));
    const qb: any = {
      innerJoin: mock(() => qb),
      where: mock(() => qb),
      limit: roleLimitMock,
    };

    const mockDb = {
      select: mock(() => ({
        from: mock(() => qb),
      })),
    };

    const role = await getActorRole(mockDb as unknown as DbOrTx, "user-1");
    expect(role).toBe("HOD_IT");
  });

  it("getActorRole() defaults to EMPLOYEE when no assignments exist", async () => {
    const roleLimitMock = mock(() => Promise.resolve([]));
    const qb: any = {
      innerJoin: mock(() => qb),
      where: mock(() => qb),
      limit: roleLimitMock,
    };

    const mockDb = {
      select: mock(() => ({
        from: mock(() => qb),
      })),
    };

    const role = await getActorRole(mockDb as unknown as DbOrTx, "user-1");
    expect(role).toBe("EMPLOYEE");
  });

  it("getActorPositionInfo() returns info for the highest-precedence assignment", async () => {
    const rows = [
      {
        positionId: "pos-emp",
        positionRole: "EMPLOYEE",
        departmentId: "dep-emp",
        reportsToPositionId: null,
      },
      {
        positionId: "pos-hod-it",
        positionRole: "HOD_IT",
        departmentId: "dep-it",
        reportsToPositionId: "pos-reports",
      },
    ];

    const limitMock = mock(() => Promise.resolve(rows));
    const qb: any = {
      innerJoin: mock(() => qb),
      where: mock(() => qb),
      limit: limitMock,
    };

    const mockDb = {
      select: mock(() => ({
        from: mock(() => qb),
      })),
    };

    const info = await getActorPositionInfo(
      mockDb as unknown as DbOrTx,
      "user-1",
    );
    expect(info).not.toBeNull();
    expect(info?.positionRole).toBe("HOD_IT");
    expect(info?.positionId).toBe("pos-hod-it");
    expect(info?.departmentId).toBe("dep-it");
  });
});
