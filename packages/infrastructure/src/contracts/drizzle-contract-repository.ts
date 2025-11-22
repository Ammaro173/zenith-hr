import { db } from "@zenith-hr/db";
import { contract } from "@zenith-hr/db/schema/contracts";
import type {
  Contract,
  IContractRepository,
} from "@zenith-hr/domain/contracts";
import { eq } from "drizzle-orm";

export class DrizzleContractRepository implements IContractRepository {
  async create(newContract: Contract): Promise<Contract> {
    const [created] = await db
      .insert(contract)
      .values({
        id: newContract.id,
        requestId: newContract.requestId,
        candidateName: newContract.candidateName,
        candidateEmail: newContract.candidateEmail,
        contractTerms: newContract.contractTerms,
        pdfS3Url: newContract.pdfS3Url,
        status: newContract.status,
        signingProviderId: newContract.signingProviderId,
      })
      .returning();

    return created as Contract;
  }

  async findById(id: string): Promise<Contract | null> {
    const [found] = await db
      .select()
      .from(contract)
      .where(eq(contract.id, id))
      .limit(1);

    return (found as Contract) || null;
  }

  async findBySigningProviderId(
    signingProviderId: string
  ): Promise<Contract | null> {
    const [found] = await db
      .select()
      .from(contract)
      .where(eq(contract.signingProviderId, signingProviderId))
      .limit(1);

    if (!found) return null;

    return {
      id: found.id,
      requestId: found.requestId,
      candidateName: found.candidateName, // Assuming candidateName maps to candidateId in the domain model
      candidateEmail: found.candidateEmail,
      status: found.status,
      pdfS3Url: found.pdfS3Url, // Assuming contentUrl maps to pdfS3Url
      signingProviderId: found.signingProviderId,
      contractTerms: found.contractTerms as any, // Assuming terms maps to contractTerms
      createdAt: found.createdAt,
      updatedAt: found.updatedAt,
    };
  }

  async update(updatedContract: Contract): Promise<Contract> {
    const [updated] = await db
      .update(contract)
      .set({
        candidateName: updatedContract.candidateName,
        candidateEmail: updatedContract.candidateEmail,
        status: updatedContract.status,
        signingProviderId: updatedContract.signingProviderId,
        updatedAt: new Date(),
      })
      .where(eq(contract.id, updatedContract.id))
      .returning();

    return updated as Contract;
  }
}
