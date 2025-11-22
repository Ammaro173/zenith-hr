import type { IRequestRepository } from "@zenith-hr/domain/requests";
import type { UpdateRequestInput, UpdateRequestOutput } from "../dtos";

export class UpdateRequestUseCase {
  private readonly requestRepository: IRequestRepository;

  constructor(requestRepository: IRequestRepository) {
    this.requestRepository = requestRepository;
  }

  async execute(input: UpdateRequestInput): Promise<UpdateRequestOutput> {
    const request = await this.requestRepository.findById(input.id);

    if (!request) {
      throw new Error("REQUEST_NOT_FOUND");
    }

    // Check if user is the requester
    if (request.requesterId !== input.requesterId) {
      throw new Error("FORBIDDEN");
    }

    // Check if request is in DRAFT status
    if (request.status !== "DRAFT") {
      throw new Error("BAD_REQUEST");
    }

    // Optimistic locking check
    if (request.version !== input.version) {
      throw new Error("CONFLICT");
    }

    const updatedRequest = await this.requestRepository.update({
      ...request,
      positionDetails: input.data.positionDetails || request.positionDetails,
      budgetDetails: input.data.budgetDetails || request.budgetDetails,
      version: request.version + 1,
    });

    return {
      id: updatedRequest.id,
      version: updatedRequest.version,
      status: updatedRequest.status,
    };
  }
}
