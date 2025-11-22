import type { IRequestRepository } from "@zenith-hr/domain/requests";
import { v4 as uuidv4 } from "uuid";
import type { CreateRequestInput, CreateRequestOutput } from "../dtos";

export class CreateRequestUseCase {
  constructor(private readonly requestRepository: IRequestRepository) {}

  private generateRequestCode(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `REQ-${year}-${random}`;
  }

  async execute(input: CreateRequestInput): Promise<CreateRequestOutput> {
    const requestCode = this.generateRequestCode();
    const request = await this.requestRepository.create({
      id: uuidv4(),
      requesterId: input.requesterId,
      requestCode,
      status: "DRAFT",
      positionDetails: input.positionDetails,
      budgetDetails: input.budgetDetails,
      revisionVersion: 0,
      version: 0,
    });

    return {
      id: request.id,
      requestCode: request.requestCode,
      status: request.status,
    };
  }
}
