import { ORPCError } from "@orpc/server";
import { db } from "@zenith-hr/db";
import { contract } from "@zenith-hr/db/schema/contracts";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { generateContractPDF } from "../services/pdf";
import { generatePresignedURL, uploadPDF } from "../services/storage";

export const contractsRouter = {
  generate: protectedProcedure
    .input(
      z.object({
        requestId: z.string().uuid(),
        candidateName: z.string().min(1),
        candidateEmail: z.string().email(),
        candidateAddress: z.string().optional(),
        startDate: z.string(),
      })
    )
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      // Get the approved request
      const [request] = await db
        .select()
        .from(manpowerRequest)
        .where(eq(manpowerRequest.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new ORPCError("NOT_FOUND");
      }

      if (
        request.status !== "APPROVED_OPEN" &&
        request.status !== "HIRING_IN_PROGRESS"
      ) {
        throw new ORPCError("BAD_REQUEST");
      }

      // Extract data from request
      const positionDetails = request.positionDetails as {
        title: string;
        department: string;
      };
      const budgetDetails = request.budgetDetails as {
        salaryMin: number;
        salaryMax: number;
        currency: string;
      };

      // Use average salary
      const salary = (budgetDetails.salaryMin + budgetDetails.salaryMax) / 2;

      // Generate PDF
      const pdfBuffer = await generateContractPDF({
        requestCode: request.requestCode,
        positionTitle: positionDetails.title,
        salary,
        currency: budgetDetails.currency || "USD",
        candidateName: input.candidateName,
        candidateEmail: input.candidateEmail,
        candidateAddress: input.candidateAddress,
        startDate: input.startDate,
      });

      // Upload to storage
      const contractId = uuidv4();
      const s3Key = `contracts/${contractId}.pdf`;
      const s3Url = await uploadPDF(s3Key, pdfBuffer);

      // Create contract record
      const [newContract] = await db
        .insert(contract)
        .values({
          id: contractId,
          requestId: input.requestId,
          candidateName: input.candidateName,
          candidateEmail: input.candidateEmail,
          contractTerms: {
            salary,
            currency: budgetDetails.currency || "USD",
            startDate: input.startDate,
            positionTitle: positionDetails.title,
          },
          pdfS3Url: s3Url,
          status: "DRAFT",
        })
        .returning();

      return newContract;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const [contractRecord] = await db
        .select()
        .from(contract)
        .where(eq(contract.id, input.id))
        .limit(1);

      if (!contractRecord) {
        throw new ORPCError("NOT_FOUND");
      }

      return contractRecord;
    }),

  updateCandidate: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        candidateName: z.string().min(1).optional(),
        candidateEmail: z.string().email().optional(),
        candidateAddress: z.string().optional(),
      })
    )
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const [contractRecord] = await db
        .select()
        .from(contract)
        .where(eq(contract.id, input.id))
        .limit(1);

      if (!contractRecord) {
        throw new ORPCError("NOT_FOUND");
      }

      if (contractRecord.status !== "DRAFT") {
        throw new ORPCError("BAD_REQUEST");
      }

      const [updated] = await db
        .update(contract)
        .set({
          candidateName: input.candidateName || contractRecord.candidateName,
          candidateEmail: input.candidateEmail || contractRecord.candidateEmail,
          updatedAt: new Date(),
        })
        .where(eq(contract.id, input.id))
        .returning();

      return updated;
    }),

  sendForSignature: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const [contractRecord] = await db
        .select()
        .from(contract)
        .where(eq(contract.id, input.id))
        .limit(1);

      if (!contractRecord) {
        throw new ORPCError("NOT_FOUND");
      }

      if (contractRecord.status !== "DRAFT") {
        throw new ORPCError("BAD_REQUEST");
      }

      // Mock e-signature provider ID
      const signingProviderId = `docusign_${uuidv4()}`;

      const [updated] = await db
        .update(contract)
        .set({
          status: "SENT_FOR_SIGNATURE",
          signingProviderId,
          updatedAt: new Date(),
        })
        .where(eq(contract.id, input.id))
        .returning();

      return updated;
    }),

  getPresignedUrl: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const [contractRecord] = await db
        .select()
        .from(contract)
        .where(eq(contract.id, input.id))
        .limit(1);

      if (!contractRecord?.pdfS3Url) {
        throw new ORPCError("NOT_FOUND");
      }

      // Extract key from S3 URL
      const key = contractRecord.pdfS3Url.replace(
        "s3://zenith-hr-contracts/",
        ""
      );

      const presignedUrl = await generatePresignedURL(key);

      return { url: presignedUrl };
    }),
};
