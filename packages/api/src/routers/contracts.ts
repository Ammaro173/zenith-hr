import { ORPCError } from "@orpc/server";
import { contract } from "@zenith-hr/db/schema/contracts";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../index";

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
      const [request] = await context.db
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

      const positionDetails = request.positionDetails as {
        title: string;
        department: string;
      };
      const budgetDetails = request.budgetDetails as {
        salaryMin: number;
        salaryMax: number;
        currency: string;
      };
      const salary = (budgetDetails.salaryMin + budgetDetails.salaryMax) / 2;

      // 1. Generate PDF
      const pdfBuffer = await context.pdf.generateContractPdf({
        requestCode: request.requestCode,
        candidateName: input.candidateName,
        candidateEmail: input.candidateEmail,
        candidateAddress: input.candidateAddress,
        positionTitle: positionDetails.title,
        salary,
        currency: budgetDetails.currency || "USD",
        startDate: input.startDate,
      });

      // 2. Upload to S3
      const key = `contracts/${request.requestCode}/${Date.now()}_contract.pdf`;
      const pdfUrl = await context.storage.upload(key, pdfBuffer);

      // 3. Save to DB
      const [newContract] = await context.db
        .insert(contract)
        .values({
          requestId: input.requestId,
          candidateName: input.candidateName,
          candidateEmail: input.candidateEmail,
          contractTerms: {
            salary,
            currency: budgetDetails.currency || "USD",
            startDate: input.startDate,
            positionTitle: positionDetails.title,
          },
          pdfS3Url: pdfUrl, // Storing full URL or key depending on storage service implementation. Assuming URL/Key returned is what we want.
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
      const [contractRecord] = await context.db
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
      const [contractRecord] = await context.db
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

      const [updated] = await context.db
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
      const [contractRecord] = await context.db
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
      const signingProviderId = "docusign_mock";

      const [updated] = await context.db
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
      const [contractRecord] = await context.db
        .select()
        .from(contract)
        .where(eq(contract.id, input.id))
        .limit(1);

      if (!contractRecord?.pdfS3Url) {
        throw new ORPCError("NOT_FOUND");
      }

      // Extract key from S3 URL
      // Assuming the storage service returns a full URL like s3://... or https://...
      // We need to strip the prefix to get the key if the storage service expects a key.
      // Adjusting logic to be robust.
      const key = contractRecord.pdfS3Url.replace(
        "s3://zenith-hr-contracts/",
        ""
      );

      const presignedUrl = await context.storage.getPresignedUrl(key);
      return { url: presignedUrl };
    }),
};
