import type { DbOrTx } from "@zenith-hr/db";
import { performanceReview, user, userPositionAssignment } from "@zenith-hr/db";
import { and, eq, inArray, lt } from "drizzle-orm";
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
        employeeId: candidate.id,
        reviewerId: await getDirectManagerUserId(candidate.id),
        reviewType: "PROBATION",
        reviewPeriodEnd: addDays(new Date(), 14).toISOString(),
      });
      created += 1;
    }

    return { created, skipped: eligibleUsers.length - created };
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
      const overdue = await sweepOverdueReviews();

      return {
        success: true,
        overdue,
        probation,
      };
    },
  };
};

export type PerformanceCronService = ReturnType<
  typeof createPerformanceCronService
>;
