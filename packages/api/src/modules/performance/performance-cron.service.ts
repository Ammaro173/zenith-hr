import type { DbOrTx } from "@zenith-hr/db";
import {
  jobPosition,
  notificationOutbox,
  performanceCycle,
  performanceReview,
  user,
  userPositionAssignment,
} from "@zenith-hr/db";
import { and, eq, gte, inArray, lt, lte } from "drizzle-orm";
import { generateIdempotencyKey } from "../../shared/utils";
import type { PerformanceService } from "./performance.service";

export const createPerformanceCronService = (
  db: DbOrTx,
  performanceService: PerformanceService,
) => {
  const addDays = (date: Date, days: number) => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
  };

  const isMonthDay = (date: Date, month: number, day: number) => {
    return date.getUTCMonth() === month && date.getUTCDate() === day;
  };

  const getCycleForDate = async (date: Date) => {
    return await db.query.performanceCycle.findFirst({
      where: and(
        eq(performanceCycle.status, "ACTIVE"),
        lte(performanceCycle.startDate, date),
        gte(performanceCycle.endDate, date),
      ),
    });
  };

  const getDirectManagerUserId = async (employeeId: string) => {
    const assignment = await db.query.userPositionAssignment.findFirst({
      where: eq(userPositionAssignment.userId, employeeId),
      with: {
        position: {
          columns: {
            reportsToPositionId: true,
          },
        },
      },
    });

    const reportsToPositionId = assignment?.position?.reportsToPositionId;
    if (!reportsToPositionId) {
      return undefined;
    }

    const managerAssignment = await db.query.userPositionAssignment.findFirst({
      where: eq(userPositionAssignment.positionId, reportsToPositionId),
    });

    return managerAssignment?.userId;
  };

  const getHrRecipients = async () => {
    const hrAssignments = await db
      .select({ userId: userPositionAssignment.userId })
      .from(userPositionAssignment)
      .innerJoin(
        jobPosition,
        eq(userPositionAssignment.positionId, jobPosition.id),
      )
      .where(eq(jobPosition.role, "HOD_HR"));

    const admins = await db.query.user.findMany({
      where: eq(user.role, "ADMIN"),
      columns: { id: true },
    });

    return [
      ...new Set([
        ...hrAssignments.map((assignment) => assignment.userId),
        ...admins.map((admin) => admin.id),
      ]),
    ];
  };

  const enqueueNotification = async (
    userId: string,
    seed: string,
    title: string,
    body: string,
    link?: string,
  ) => {
    const now = new Date();
    await db
      .insert(notificationOutbox)
      .values({
        idempotencyKey: generateIdempotencyKey(seed),
        userId,
        payload: {
          body,
          link: link ?? null,
          title,
          type: "ACTION_REQUIRED",
        },
        status: "PENDING",
        nextAttemptAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
  };

  const autoCreateProbationReviews = async () => {
    const sixMonthsMs = 6 * 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const thresholdStart = new Date(now - sixMonthsMs - 24 * 60 * 60 * 1000);
    const thresholdEnd = new Date(now - sixMonthsMs + 24 * 60 * 60 * 1000);

    const candidates = await db.query.user.findMany({
      where: eq(user.status, "ACTIVE"),
    });

    const eligibleUsers = candidates.filter((candidate) => {
      if (!candidate.joiningDate) {
        return false;
      }
      const joiningDate = candidate.joiningDate.getTime();
      return (
        joiningDate >= thresholdStart.getTime() &&
        joiningDate <= thresholdEnd.getTime()
      );
    });

    const cycle = await getCycleForDate(new Date());
    if (!cycle) {
      return {
        created: 0,
        reason: "no-active-cycle",
        skipped: eligibleUsers.length,
      };
    }

    let created = 0;
    for (const candidate of eligibleUsers) {
      const existing = await db.query.performanceReview.findFirst({
        where: and(
          eq(performanceReview.employeeId, candidate.id),
          eq(performanceReview.reviewType, "PROBATION"),
        ),
      });

      if (existing) {
        continue;
      }

      await performanceService.createReview({
        cycleId: cycle.id,
        employeeId: candidate.id,
        reviewerId: await getDirectManagerUserId(candidate.id),
        reviewType: "PROBATION",
        reviewPeriodEnd: addDays(new Date(), 14).toISOString(),
      });
      created += 1;
    }

    return { created, skipped: eligibleUsers.length - created };
  };

  const autoCreateObjectiveSettings = async () => {
    const now = new Date();
    if (!isMonthDay(now, 0, 1)) {
      return { created: 0, reason: "not-scheduled-day", skipped: 0 };
    }

    const cycle = await getCycleForDate(now);
    if (!cycle) {
      return { created: 0, reason: "no-active-cycle", skipped: 0 };
    }

    const activeUsers = await db.query.user.findMany({
      where: eq(user.status, "ACTIVE"),
      columns: { id: true },
    });

    let created = 0;
    for (const activeUser of activeUsers) {
      const existing = await db.query.performanceReview.findFirst({
        where: and(
          eq(performanceReview.cycleId, cycle.id),
          eq(performanceReview.employeeId, activeUser.id),
          eq(performanceReview.reviewType, "OBJECTIVE_SETTING"),
        ),
      });

      if (existing) {
        continue;
      }

      await performanceService.createReview({
        cycleId: cycle.id,
        employeeId: activeUser.id,
        reviewerId: await getDirectManagerUserId(activeUser.id),
        reviewType: "OBJECTIVE_SETTING",
        reviewPeriodEnd: addDays(now, 30).toISOString(),
      });
      created += 1;
    }

    return { created, skipped: activeUsers.length - created };
  };

  const autoCreateAnnualReviews = async () => {
    const now = new Date();
    if (!isMonthDay(now, 11, 1)) {
      return { created: 0, reason: "not-scheduled-day", skipped: 0 };
    }

    const cycle = await getCycleForDate(now);
    if (!cycle) {
      return { created: 0, reason: "no-active-cycle", skipped: 0 };
    }

    const activeUsers = await db.query.user.findMany({
      where: eq(user.status, "ACTIVE"),
      columns: { id: true, name: true },
    });

    let created = 0;
    for (const activeUser of activeUsers) {
      const existing = await db.query.performanceReview.findFirst({
        where: and(
          eq(performanceReview.cycleId, cycle.id),
          eq(performanceReview.employeeId, activeUser.id),
          eq(performanceReview.reviewType, "ANNUAL_PERFORMANCE"),
        ),
      });

      if (existing) {
        continue;
      }

      const linkedObjective = await db.query.performanceReview.findFirst({
        where: and(
          eq(performanceReview.cycleId, cycle.id),
          eq(performanceReview.employeeId, activeUser.id),
          eq(performanceReview.reviewType, "OBJECTIVE_SETTING"),
        ),
      });

      const createdReview = await performanceService.createReview({
        cycleId: cycle.id,
        employeeId: activeUser.id,
        reviewerId: await getDirectManagerUserId(activeUser.id),
        reviewType: "ANNUAL_PERFORMANCE",
        reviewPeriodEnd: addDays(now, 14).toISOString(),
      });

      if (linkedObjective) {
        await db
          .update(performanceReview)
          .set({ linkedObjectiveReviewId: linkedObjective.id })
          .where(eq(performanceReview.id, createdReview.id));
      } else {
        const hrRecipients = await getHrRecipients();
        for (const hrRecipient of hrRecipients) {
          await enqueueNotification(
            hrRecipient,
            `performance:annual:missing-objective:${createdReview.id}:${hrRecipient}`,
            "Annual review created without linked objective",
            `${activeUser.name}'s annual review was created without a linked objective-setting review.`,
            `/performance/reviews/${createdReview.id}`,
          );
        }
      }

      created += 1;
    }

    return { created, skipped: activeUsers.length - created };
  };

  const sweepOverdueReviews = async () => {
    const overdueReviews = await db.query.performanceReview.findMany({
      where: and(
        lt(performanceReview.dueAt, new Date()),
        inArray(performanceReview.status, [
          "DUE",
          "SELF_REVIEW",
          "SENT_TO_MANAGER",
          "AWAITING_MANAGER_REVIEW",
        ]),
      ),
    });

    for (const review of overdueReviews) {
      await performanceService.transitionReviewStatus(
        review.id,
        "OVERDUE",
        undefined,
      );
    }

    return { transitioned: overdueReviews.length };
  };

  return {
    runDailyChecks: async () => {
      const probation = await autoCreateProbationReviews();
      const objective = await autoCreateObjectiveSettings();
      const annual = await autoCreateAnnualReviews();
      const overdue = await sweepOverdueReviews();

      return {
        success: true,
        annual,
        objective,
        overdue,
        probation,
      };
    },
  };
};

export type PerformanceCronService = ReturnType<
  typeof createPerformanceCronService
>;
