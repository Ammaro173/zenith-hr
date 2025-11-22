// biome-ignore lint/performance/noBarrelFile: Required for Drizzle schema organization
export * from "./approval-logs";
export * from "./auth";
export * from "./contracts";
export * from "./manpower-requests";
export * from "./request-versions";

// Define relations after all schemas are imported
import { relations } from "drizzle-orm";
import { approvalLog } from "./approval-logs";
import { user } from "./auth";
import { contract } from "./contracts";
import { manpowerRequest } from "./manpower-requests";
import { requestVersion } from "./request-versions";

// Re-export relations using export-from syntax
export { approvalLogRelations } from "./approval-logs";
export { userRelations } from "./auth";
export { contractRelations } from "./contracts";
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
  })
);
