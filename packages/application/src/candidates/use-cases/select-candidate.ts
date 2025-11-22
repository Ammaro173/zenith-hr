import type { ICandidateRepository } from "@zenith-hr/domain/candidates";
import type { SelectCandidateInput, SelectCandidateOutput } from "../dtos";

export class SelectCandidateUseCase {
  private readonly candidateRepository: ICandidateRepository;

  constructor(candidateRepository: ICandidateRepository) {
    this.candidateRepository = candidateRepository;
  }

  async execute(input: SelectCandidateInput): Promise<SelectCandidateOutput> {
    const candidate = await this.candidateRepository.findById(
      input.candidateId
    );

    if (!candidate) {
      throw new Error("CANDIDATE_NOT_FOUND");
    }

    if (candidate.requestId !== input.requestId) {
      throw new Error("INVALID_REQUEST_ID");
    }

    return {
      success: true,
      candidate: {
        name: candidate.name,
        email: candidate.email,
        cvUrl: candidate.cvUrl,
      },
    };
  }
}
