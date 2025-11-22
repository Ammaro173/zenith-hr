// Export all schemas

export * from "./approval-logs";
export * from "./auth";
export * from "./contracts";
export * from "./manpower-requests";
export * from "./request-versions";

// Define relations after all schemas are imported
import { relations } from "drizzle-orm";
import { approvalLog, approvalLogRelations } from "./approval-logs";
import { user, userRelations } from "./auth";
import { contract, contractRelations } from "./contracts";
import { manpowerRequest } from "./manpower-requests";
import { requestVersion, requestVersionRelations } from "./request-versions";

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
  })
);

// Re-export relations
export {
  userRelations,
  approvalLogRelations,
  contractRelations,
  requestVersionRelations,
};
