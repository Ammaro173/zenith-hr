export * from "./approval-logs";
export * from "./audit-logs";
export * from "./auth";
export * from "./business-trips";
export * from "./candidates";
export * from "./contracts";
export * from "./departments";
export * from "./import-history";
export * from "./job-descriptions";
export * from "./manpower-requests";
export * from "./notifications";
export * from "./performance";
export * from "./position-slots";
export * from "./request-versions";
export * from "./separations";

// Define relations after all schemas are imported
import { relations } from "drizzle-orm";
import { approvalLog } from "./approval-logs";
import { user } from "./auth";
import { contract } from "./contracts";
import { department } from "./departments";
import { jobDescription } from "./job-descriptions";
import { manpowerRequest } from "./manpower-requests";
import { jobPosition } from "./position-slots";
import { requestVersion } from "./request-versions";

// Re-export relations using export-from syntax
export { approvalLogRelations } from "./approval-logs";
export { auditLogRelations } from "./audit-logs";
export { userRelations } from "./auth";
export { businessTripRelations, tripExpenseRelations } from "./business-trips";
export { contractRelations } from "./contracts";
export {
  importHistoryItemRelations,
  importHistoryRelations,
} from "./import-history";
export {
  notificationOutboxRelations,
  notificationRelations,
} from "./notifications";
export {
  competencyTemplateRelations,
  performanceCompetencyRelations,
  performanceCycleRelations,
  performanceGoalRelations,
  performanceReviewRelations,
} from "./performance";
export {
  jobPositionRelations,
  positionSlotRelations,
  slotAssignmentRelations,
  userPositionAssignmentRelations,
} from "./position-slots";
export { requestVersionRelations } from "./request-versions";

export const jobDescriptionRelations = relations(
  jobDescription,
  ({ one, many }) => ({
    department: one(department, {
      fields: [jobDescription.departmentId],
      references: [department.id],
    }),
    reportsToPosition: one(jobPosition, {
      fields: [jobDescription.reportsToPositionId],
      references: [jobPosition.id],
    }),
    positions: many(jobPosition),
  }),
);

export const manpowerRequestRelations = relations(
  manpowerRequest,
  ({ one, many }) => ({
    requester: one(user, {
      fields: [manpowerRequest.requesterId],
      references: [user.id],
    }),
    requesterPosition: one(jobPosition, {
      fields: [manpowerRequest.requesterPositionId],
      references: [jobPosition.id],
    }),
    currentApproverPosition: one(jobPosition, {
      fields: [manpowerRequest.currentApproverPositionId],
      references: [jobPosition.id],
    }),
    approvalLogs: many(approvalLog),
    contracts: many(contract),
    versions: many(requestVersion),
  }),
);
