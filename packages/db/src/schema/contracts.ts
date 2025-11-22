import { relations } from "drizzle-orm";
import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { manpowerRequest } from "./manpower-requests";

export const contractStatusEnum = pgEnum("contract_status", [
  "DRAFT",
  "SENT_FOR_SIGNATURE",
  "SIGNED",
  "VOIDED",
]);

export const contract = pgTable("contract", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => manpowerRequest.id, { onDelete: "cascade" }),
  candidateName: text("candidate_name").notNull(),
  candidateEmail: text("candidate_email").notNull(),
  contractTerms: jsonb("contract_terms").notNull(),
  pdfS3Url: text("pdf_s3_url"),
  signingProviderId: text("signing_provider_id"),
  status: contractStatusEnum("status").notNull().default("DRAFT"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const contractRelations = relations(contract, ({ one }) => ({
  request: one(manpowerRequest, {
    fields: [contract.requestId],
    references: [manpowerRequest.id],
  }),
}));
