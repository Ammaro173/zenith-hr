import type { db as _db } from "@zenith-hr/db";
import { contract } from "@zenith-hr/db/schema/contracts";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type {
  PdfService,
  StorageService,
} from "../../infrastructure/interfaces";
import { AppError } from "../../shared/errors";
import type {
  generateContractSchema,
  updateContractSchema,
} from "./contracts.schema";

type GenerateContractInput = z.infer<typeof generateContractSchema>;
type UpdateContractInput = z.infer<typeof updateContractSchema>;

export const createContractsService = (
  db: typeof _db,
  storage: StorageService,
  pdf: PdfService,
) => {
  return {
    async generate(input: GenerateContractInput) {
      // Get the approved request
      const [request] = await db
        .select()
        .from(manpowerRequest)
        .where(eq(manpowerRequest.id, input.requestId))
        .limit(1);

      if (!request) {
        throw AppError.notFound("Request not found");
      }

      if (
        request.status !== "APPROVED_OPEN" &&
        request.status !== "HIRING_IN_PROGRESS"
      ) {
        throw AppError.badRequest(
          "Request must be APPROVED_OPEN or HIRING_IN_PROGRESS",
        );
      }

      const positionDetails = request.positionDetails as {
        title: string;
        department: string;
      };
      const salaryMin = Number(request.salaryRangeMin ?? 0);
      const salaryMax = Number(request.salaryRangeMax ?? 0);
      const salary = (salaryMin + salaryMax) / 2;
      const currency =
        (request.budgetDetails as { currency?: string }).currency || "USD";

      // 1. Generate PDF
      const pdfBuffer = await pdf.generateContractPdf({
        requestCode: request.requestCode,
        candidateName: input.candidateName,
        candidateEmail: input.candidateEmail,
        candidateAddress: input.candidateAddress,
        positionTitle: positionDetails.title,
        salary,
        currency,
        startDate: input.startDate,
      });

      // 2. Upload to S3
      const key = `contracts/${request.requestCode}/${Date.now()}_contract.pdf`;
      const pdfUrl = await storage.upload(key, pdfBuffer);

      // 3. Save to DB
      const [newContract] = await db
        .insert(contract)
        .values({
          requestId: input.requestId,
          candidateName: input.candidateName,
          candidateEmail: input.candidateEmail,
          contractTerms: {
            salary,
            currency,
            startDate: input.startDate,
            positionTitle: positionDetails.title,
          },
          pdfS3Url: pdfUrl,
          status: "DRAFT",
        })
        .returning();

      return newContract;
    },

    async getById(id: string) {
      const [contractRecord] = await db
        .select()
        .from(contract)
        .where(eq(contract.id, id))
        .limit(1);
      return contractRecord;
    },

    async updateCandidate(input: UpdateContractInput) {
      const [contractRecord] = await db
        .select()
        .from(contract)
        .where(eq(contract.id, input.id))
        .limit(1);

      if (!contractRecord) {
        throw AppError.notFound("Contract not found");
      }
      if (contractRecord.status !== "DRAFT") {
        throw AppError.badRequest("Contract is not in DRAFT status");
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
    },

    async sendForSignature(id: string) {
      const [contractRecord] = await db
        .select()
        .from(contract)
        .where(eq(contract.id, id))
        .limit(1);

      if (!contractRecord) {
        throw AppError.notFound("Contract not found");
      }
      if (contractRecord.status !== "DRAFT") {
        throw AppError.badRequest("Contract is not in DRAFT status");
      }

      // Mock e-signature provider ID
      const signingProviderId = "docusign_mock";

      const [updated] = await db
        .update(contract)
        .set({
          status: "SENT_FOR_SIGNATURE",
          signingProviderId,
          updatedAt: new Date(),
        })
        .where(eq(contract.id, id))
        .returning();

      return updated;
    },

    async getPresignedUrl(id: string) {
      const [contractRecord] = await db
        .select()
        .from(contract)
        .where(eq(contract.id, id))
        .limit(1);

      if (!contractRecord?.pdfS3Url) {
        throw AppError.notFound("Contract or PDF not found");
      }

      const key = contractRecord.pdfS3Url.replace(
        "s3://zenith-hr-contracts/",
        "",
      );

      const presignedUrl = await storage.getPresignedUrl(key);
      return { url: presignedUrl };
    },
  };
};

export type ContractsService = ReturnType<typeof createContractsService>;
