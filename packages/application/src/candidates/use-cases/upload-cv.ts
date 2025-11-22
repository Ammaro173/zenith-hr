import type { ICandidateRepository } from "@zenith-hr/domain/candidates";
import type { IStorageService } from "@zenith-hr/domain/contracts";
import type { UploadCVInput, UploadCVOutput } from "../dtos";

export class UploadCVUseCase {
  constructor(
    private candidateRepository: ICandidateRepository,
    private storageService: IStorageService
  ) {}

  async execute(input: UploadCVInput): Promise<UploadCVOutput> {
    // 1. Upload CV
    const cvKey = `cvs/${input.requestId}/${Date.now()}.pdf`;
    const cvUrl = await this.storageService.upload(cvKey, input.cvFile);

    // 2. Create Candidate ID
    const candidateId = `${input.requestId}_${input.candidateEmail}`;

    // 3. Save Candidate
    await this.candidateRepository.save({
      id: candidateId,
      requestId: input.requestId,
      name: input.candidateName,
      email: input.candidateEmail,
      cvUrl: cvKey, // Storing key as URL for now to match previous logic
    });

    return {
      candidateId,
      cvUrl: cvKey,
    };
  }
}
