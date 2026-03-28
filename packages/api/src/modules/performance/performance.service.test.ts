import { describe, expect, it, mock } from "bun:test";
import { createPerformanceService } from "./performance.service";

describe("PerformanceService", () => {
  // Factory to create fresh mock for each test (loose `any`: Bun mocks ≠ Drizzle `DbOrTx`)
  function createMockDb() {
    const mockDb: any = {
      insert: mock(() => ({
        values: mock(() => ({
          onConflictDoNothing: mock(() => Promise.resolve([])),
          returning: mock(() =>
            Promise.resolve([{ id: "review-123", status: "DUE" }]),
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
      delete: mock(() => ({
        where: mock(() => ({
          returning: mock(() =>
            Promise.resolve([{ id: "review-123", overallRating: 4 }]),
          ),
        })),
      })),
      select: mock(() => ({
        from: mock(() => ({
          innerJoin: mock(() => ({
            where: mock(() => ({
              limit: mock(() => Promise.resolve([])),
            })),
          })),
          where: mock(() => ({
            orderBy: mock(() => Promise.resolve([])),
            limit: mock(() => Promise.resolve([])),
          })),
        })),
      })),
      execute: mock(() => Promise.resolve({ rows: [] })),
      query: {
        user: {
          findFirst: mock(() =>
            Promise.resolve({
              departmentId: "dept-1",
              id: "emp-1",
              status: "ACTIVE" as const,
            }),
          ),
        },
        performanceReview: {
          findFirst: mock(() =>
            Promise.resolve({
              employeeId: "emp-1",
              id: "review-123",
              reviewType: "ANNUAL_PERFORMANCE",
              reviewerId: "mgr-1",
              status: "DUE",
            }),
          ),
        },
        performanceGoal: {
          findFirst: mock(() =>
            Promise.resolve({ id: "goal-1", reviewId: "review-123" }),
          ),
        },
        performanceCompetency: {
          findFirst: mock(() =>
            Promise.resolve({ id: "comp-1", reviewId: "review-123" }),
          ),
          findMany: mock(() =>
            Promise.resolve([
              {
                id: "comp-1",
                rating: 4,
                reviewId: "review-123",
                weight: 100,
              },
            ]),
          ),
        },
        competencyTemplate: {
          findMany: mock(() => Promise.resolve([])),
        },
      },
      transaction: mock((cb: (tx: unknown) => Promise<unknown>) => cb(mockDb)),
    };
    return mockDb;
  }

  function createQueuedSelectMock(
    sequence: Array<
      | { type: "from"; value: unknown[] }
      | { type: "limit"; value: unknown[] }
      | { type: "where"; value: unknown[] }
      | { type: "whereOrderBy"; value: unknown[] }
    >,
  ) {
    return mock(() => {
      const next = sequence.shift();
      if (!next) {
        throw new Error("Unexpected select call");
      }

      return {
        from: mock(() => {
          if (next.type === "from") {
            return Promise.resolve(next.value);
          }

          if (next.type === "where") {
            return {
              where: mock(() => Promise.resolve(next.value)),
            };
          }

          if (next.type === "whereOrderBy") {
            return {
              where: mock(() => ({
                orderBy: mock(() => Promise.resolve(next.value)),
              })),
            };
          }

          return {
            innerJoin: mock(() => ({
              where: mock(() => ({
                limit: mock(() => Promise.resolve(next.value)),
              })),
            })),
          };
        }),
      };
    });
  }

  function mockDescendantManagerAccess(
    mockDb: ReturnType<typeof createMockDb>,
  ) {
    mockDb.select = createQueuedSelectMock([
      { type: "limit", value: [{ role: "MANAGER" }] },
      { type: "where", value: [{ positionId: "pos-manager" }] },
      {
        type: "from",
        value: [{ id: "pos-employee", reportsTo: "pos-manager" }],
      },
      { type: "where", value: [{ userId: "emp-1" }] },
    ]);
  }

  function mockGlobalActorRole(
    mockDb: ReturnType<typeof createMockDb>,
    role = "HOD_HR",
  ) {
    mockDb.select = mock(() => ({
      from: mock(() => ({
        innerJoin: mock(() => ({
          where: mock(() => ({
            limit: mock(() => Promise.resolve([{ role }])),
          })),
        })),
        where: mock(() => ({
          orderBy: mock(() => Promise.resolve([])),
          limit: mock(() => Promise.resolve([])),
        })),
      })),
    }));
  }

  it("should create a performance review", async () => {
    const mockDb = createMockDb();
    const service = createPerformanceService(mockDb);

    const input = {
      employeeId: "emp-1",
      reviewerId: "mgr-1",
      reviewType: "ANNUAL_PERFORMANCE" as const,
    };

    // Mock insert to return created review
    mockDb.insert.mockReturnValueOnce({
      values: mock(() => ({
        returning: mock(() =>
          Promise.resolve([{ id: "review-123", status: "DUE", ...input }]),
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
      expect.objectContaining({ id: "review-123", status: "DUE" }),
    );
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("should update a performance review", async () => {
    const mockDb = createMockDb();
    const service = createPerformanceService(mockDb);

    const input = {
      reviewId: "review-123",
      overallRating: 4,
      managerComment: "Great work!",
    };

    const result = await service.updateReview(input, "mgr-1");

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

    const result = await service.createGoal(input, "emp-1");

    expect(result).toEqual(
      expect.objectContaining({ id: "goal-1", status: "PENDING" }),
    );
    expect(mockDb.insert).toHaveBeenCalled();
  });

  describe("transitionReviewStatus", () => {
    it("should transition status and queue notification", async () => {
      const mockDb = createMockDb();
      const service = createPerformanceService(mockDb);

      // Mock findFirst for the review
      mockDb.query.performanceReview.findFirst.mockResolvedValueOnce({
        id: "review-123",
        employeeId: "emp-1",
        reviewerId: "mgr-1",
        reviewType: "ANNUAL_PERFORMANCE",
        status: "DUE",
      });

      // Mock update
      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() =>
              Promise.resolve([{ id: "review-123", status: "SELF_REVIEW" }]),
            ),
          })),
        })),
      });

      // Mock notification outbox insert
      mockDb.insert.mockReturnValueOnce({
        values: mock(() => ({
          onConflictDoNothing: mock(() => Promise.resolve([])),
        })),
      });

      const result = await service.transitionReviewStatus(
        "review-123",
        "SELF_REVIEW",
        "emp-1",
      );

      expect(result?.status).toBe("SELF_REVIEW");
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should block descendant managers from submitting probation reviews", async () => {
      const mockDb = createMockDb();
      mockDescendantManagerAccess(mockDb);
      const service = createPerformanceService(mockDb);

      mockDb.query.performanceReview.findFirst.mockResolvedValueOnce({
        employeeId: "emp-1",
        id: "review-123",
        reviewType: "PROBATION",
        reviewerId: "mgr-1",
        status: "SENT_TO_MANAGER",
      });

      await expect(
        service.submitReview("review-123", "mgr-ancestor"),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("access control", () => {
    it("should return actor-specific review permissions", async () => {
      const mockDb = createMockDb();
      const service = createPerformanceService(mockDb);

      const review = await service.getReview("review-123", "emp-1");

      expect(review).toEqual(
        expect.objectContaining({
          id: "review-123",
          permissions: expect.objectContaining({
            canEditCompetencies: true,
            canEditManagerComment: false,
            canEditSelfComment: true,
            canManageGoals: true,
            canSubmit: true,
          }),
        }),
      );
    });

    it("should allow employees to update self comments only", async () => {
      const mockDb = createMockDb();
      const service = createPerformanceService(mockDb);

      const result = await service.updateReview(
        {
          reviewId: "review-123",
          selfComment: "Employee self reflection",
        },
        "emp-1",
      );

      expect(result).toEqual(
        expect.objectContaining({ id: "review-123", overallRating: 4 }),
      );
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should allow reviewers to update review fields", async () => {
      const mockDb = createMockDb();
      const service = createPerformanceService(mockDb);

      const result = await service.updateReview(
        {
          reviewId: "review-123",
          managerComment: "Reviewed by manager",
        },
        "mgr-1",
      );

      expect(result).toEqual(
        expect.objectContaining({ id: "review-123", overallRating: 4 }),
      );
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should allow reviewers to save drafts", async () => {
      const mockDb = createMockDb();
      const service = createPerformanceService(mockDb);

      const result = await service.saveDraft(
        {
          reviewId: "review-123",
          managerComment: "Draft manager notes",
          competencyRatings: [
            {
              competencyId: "comp-1",
              rating: 4,
              justification: "Consistent delivery",
            },
          ],
        },
        "mgr-1",
      );

      expect(result).toEqual({ success: true });
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should allow employees to save self-comment drafts", async () => {
      const mockDb = createMockDb();
      const service = createPerformanceService(mockDb);

      const result = await service.saveDraft(
        {
          reviewId: "review-123",
          selfComment: "Employee draft reflection",
        },
        "emp-1",
      );

      expect(result).toEqual({ success: true });
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should allow reviewers to update competencies", async () => {
      const mockDb = createMockDb();
      const service = createPerformanceService(mockDb);

      const result = await service.updateCompetency(
        {
          competencyId: "comp-1",
          rating: 4,
          justification: "Strong collaboration",
        },
        "mgr-1",
      );

      expect(result).toEqual(
        expect.objectContaining({ id: "review-123", overallRating: 4 }),
      );
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should allow reviewers to batch update competencies", async () => {
      const mockDb = createMockDb();
      const service = createPerformanceService(mockDb);

      const result = await service.batchUpdateCompetencies(
        {
          reviewId: "review-123",
          competencies: [
            {
              competencyId: "comp-1",
              rating: 5,
              justification: "Exceeded expectations",
            },
          ],
        },
        "mgr-1",
      );

      expect(result).toEqual({ success: true });
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should allow reviewers to create, update, and delete goals", async () => {
      const mockDb = createMockDb();
      const service = createPerformanceService(mockDb);

      mockDb.insert.mockReturnValueOnce({
        values: mock(() => ({
          returning: mock(() =>
            Promise.resolve([
              {
                id: "goal-1",
                reviewId: "review-123",
                status: "PENDING",
                title: "Stretch target",
              },
            ]),
          ),
        })),
      });

      const created = await service.createGoal(
        {
          reviewId: "review-123",
          title: "Stretch target",
          weight: 25,
        },
        "mgr-1",
      );

      expect(created).toEqual(
        expect.objectContaining({ id: "goal-1", status: "PENDING" }),
      );

      const updated = await service.updateGoal(
        {
          goalId: "goal-1",
          title: "Stretch target updated",
        },
        "mgr-1",
      );

      expect(updated).toEqual(
        expect.objectContaining({ id: "review-123", overallRating: 4 }),
      );

      const deleted = await service.deleteGoal("goal-1", "mgr-1");
      expect(deleted).toEqual(
        expect.objectContaining({ id: "review-123", overallRating: 4 }),
      );
    });

    it("should allow HOD_HR to update review fields and drafts", async () => {
      const mockDb = createMockDb();
      mockGlobalActorRole(mockDb);
      const service = createPerformanceService(mockDb);

      const updatedReview = await service.updateReview(
        {
          reviewId: "review-123",
          managerComment: "HR override review update",
        },
        "hod-hr-1",
      );

      expect(updatedReview).toEqual(
        expect.objectContaining({ id: "review-123", overallRating: 4 }),
      );

      const draft = await service.saveDraft(
        {
          reviewId: "review-123",
          selfComment: "HR draft intervention",
        },
        "hod-hr-1",
      );

      expect(draft).toEqual({ success: true });

      const directStatusUpdate = await service.updateReview(
        {
          reviewId: "review-123",
          status: "HR_REVIEWED",
        },
        "hod-hr-1",
      );

      expect(directStatusUpdate).toEqual(
        expect.objectContaining({ id: "review-123", overallRating: 4 }),
      );
    });

    it("should allow HOD_HR to manage competencies", async () => {
      const mockDb = createMockDb();
      mockGlobalActorRole(mockDb);
      const service = createPerformanceService(mockDb);

      mockDb.insert.mockReturnValueOnce({
        values: mock(() => ({
          returning: mock(() =>
            Promise.resolve([
              {
                description: "Leadership and coaching",
                id: "comp-2",
                reviewId: "review-123",
                weight: 20,
              },
            ]),
          ),
        })),
      });

      const created = await service.createCompetency(
        {
          reviewId: "review-123",
          name: "Leadership",
          description: "Leadership and coaching",
          weight: 20,
        },
        "hod-hr-1",
      );

      expect(created).toEqual(
        expect.objectContaining({ id: "comp-2", reviewId: "review-123" }),
      );

      const updated = await service.updateCompetency(
        {
          competencyId: "comp-1",
          rating: 5,
          justification: "HR override rating",
        },
        "hod-hr-1",
      );

      expect(updated).toEqual(
        expect.objectContaining({ id: "review-123", overallRating: 4 }),
      );

      const batch = await service.batchUpdateCompetencies(
        {
          reviewId: "review-123",
          competencies: [
            {
              competencyId: "comp-1",
              rating: 5,
              justification: "HR batch override",
            },
          ],
        },
        "hod-hr-1",
      );

      expect(batch).toEqual({ success: true });
    });

    it("should allow HOD_HR to create, update, and delete goals", async () => {
      const mockDb = createMockDb();
      mockGlobalActorRole(mockDb);
      const service = createPerformanceService(mockDb);

      mockDb.insert.mockReturnValueOnce({
        values: mock(() => ({
          returning: mock(() =>
            Promise.resolve([
              {
                id: "goal-2",
                reviewId: "review-123",
                status: "PENDING",
                title: "HR intervention goal",
              },
            ]),
          ),
        })),
      });

      const created = await service.createGoal(
        {
          reviewId: "review-123",
          title: "HR intervention goal",
          weight: 15,
        },
        "hod-hr-1",
      );

      expect(created).toEqual(
        expect.objectContaining({ id: "goal-2", status: "PENDING" }),
      );

      const updated = await service.updateGoal(
        {
          goalId: "goal-1",
          title: "HR adjusted goal",
        },
        "hod-hr-1",
      );

      expect(updated).toEqual(
        expect.objectContaining({ id: "review-123", overallRating: 4 }),
      );

      const deleted = await service.deleteGoal("goal-1", "hod-hr-1");
      expect(deleted).toEqual(
        expect.objectContaining({ id: "review-123", overallRating: 4 }),
      );
    });

    it("should block saveDraft for unrelated actors", async () => {
      const mockDb = createMockDb();
      const service = createPerformanceService(mockDb);

      await expect(
        service.saveDraft({ reviewId: "review-123" }, "intruder-1"),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("should block employees from writing manager-owned review fields", async () => {
      const mockDb = createMockDb();
      const service = createPerformanceService(mockDb);

      await expect(
        service.updateReview(
          {
            reviewId: "review-123",
            managerComment: "Employee should not set this",
          },
          "emp-1",
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      await expect(
        service.updateReview(
          {
            reviewId: "review-123",
            overallRating: 5,
          },
          "emp-1",
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("should block reviewers from writing employee-owned review fields", async () => {
      const mockDb = createMockDb();
      const service = createPerformanceService(mockDb);

      await expect(
        service.updateReview(
          {
            reviewId: "review-123",
            selfComment: "Reviewer should not set this",
          },
          "mgr-1",
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      await expect(
        service.saveDraft(
          {
            reviewId: "review-123",
            selfComment: "Reviewer draft should not set this",
          },
          "mgr-1",
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("should block non-global actors from updating review status directly", async () => {
      const mockDb = createMockDb();
      const service = createPerformanceService(mockDb);

      await expect(
        service.updateReview(
          {
            reviewId: "review-123",
            status: "SUBMITTED",
          },
          "mgr-1",
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("should block createGoal for unrelated actors", async () => {
      const mockDb = createMockDb();
      const service = createPerformanceService(mockDb);

      await expect(
        service.createGoal(
          {
            reviewId: "review-123",
            title: "Stretch target",
            weight: 25,
          },
          "intruder-1",
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("should block saveDraft for managers outside the review participants even if they manage the employee", async () => {
      const mockDb = createMockDb();
      mockDescendantManagerAccess(mockDb);
      const service = createPerformanceService(mockDb);

      await expect(
        service.saveDraft({ reviewId: "review-123" }, "mgr-ancestor"),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("should block competency updates for managers with descendant read access", async () => {
      const mockDb = createMockDb();
      mockDescendantManagerAccess(mockDb);
      const service = createPerformanceService(mockDb);

      await expect(
        service.updateCompetency(
          {
            competencyId: "comp-1",
            rating: 4,
            justification: "Observed through reporting line",
          },
          "mgr-ancestor",
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("should block batch competency updates for managers with descendant read access", async () => {
      const mockDb = createMockDb();
      mockDescendantManagerAccess(mockDb);
      const service = createPerformanceService(mockDb);

      await expect(
        service.batchUpdateCompetencies(
          {
            reviewId: "review-123",
            competencies: [
              {
                competencyId: "comp-1",
                rating: 4,
                justification: "Observed through reporting line",
              },
            ],
          },
          "mgr-ancestor",
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("should block goal updates for managers with descendant read access", async () => {
      const mockDb = createMockDb();
      mockDescendantManagerAccess(mockDb);
      const service = createPerformanceService(mockDb);

      await expect(
        service.updateGoal(
          {
            goalId: "goal-1",
            title: "Stretch target updated",
          },
          "mgr-ancestor",
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("should block goal deletion for managers with descendant read access", async () => {
      const mockDb = createMockDb();
      mockDescendantManagerAccess(mockDb);
      const service = createPerformanceService(mockDb);

      await expect(
        service.deleteGoal("goal-1", "mgr-ancestor"),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });
});
