export * from "./approval-logs";
export * from "./audit-logs";
export * from "./auth";
export * from "./business-trips";
export * from "./candidates";
export * from "./contracts";
export * from "./departments";
export * from "./manpower-requests";
export * from "./notifications";
export * from "./performance";
export * from "./request-versions";
export * from "./separations";

// Define relations after all schemas are imported
import { relations } from "drizzle-orm";
import { approvalLog } from "./approval-logs";
import { user } from "./auth";
import { contract } from "./contracts";
import { manpowerRequest } from "./manpower-requests";
import { requestVersion } from "./request-versions";

// Re-export relations using export-from syntax
export { approvalLogRelations } from "./approval-logs";
export { auditLogRelations } from "./audit-logs";
export { userRelations } from "./auth";
export { businessTripRelations, tripExpenseRelations } from "./business-trips";
export { contractRelations } from "./contracts";
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
export { requestVersionRelations } from "./request-versions";

export const manpowerRequestRelations = relations(
  manpowerRequest,
  ({ one, many }) => ({
    requester: one(user, {
      fields: [manpowerRequest.requesterId],
      references: [user.id],
    }),
    approvalLogs: many(approvalLog),
    contracts: many(contract),
    versions: many(requestVersion),
  }),
);
