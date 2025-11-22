import type { IContractRepository } from "@zenith-hr/domain/contracts";
import type {
  HandleDocusignWebhookInput,
  HandleDocusignWebhookOutput,
} from "../dtos";

export class HandleDocusignWebhookUseCase {
  constructor(private readonly contractRepository: IContractRepository) {}

  async execute(
    input: HandleDocusignWebhookInput
  ): Promise<HandleDocusignWebhookOutput> {
    if (
      input.event === "envelope_completed" &&
      input.data.status === "completed"
    ) {
      // Find contract by signing provider ID (envelopeId)
      // Note: We need to add findBySigningProviderId to IContractRepository or use a more generic find
      // For now, assuming we might need to extend the repository or use a workaround if not present.
      // Let's check IContractRepository definition.
      // It seems IContractRepository only has save and findById. We need to extend it.
      // However, since I cannot easily change the domain interface without updating all implementations (DrizzleContractRepository),
      // I will check if I can add it now.

      // Actually, looking at the original code, it does a query.
      // Let's assume for this refactor we will add `findBySigningProviderId` to the repository interface and implementation.

      const contract = await this.contractRepository.findBySigningProviderId(
        input.data.envelopeId
      );

      if (contract) {
        contract.status = "SIGNED";
        contract.updatedAt = new Date();
        await this.contractRepository.save(contract);

        return { success: true, contractId: contract.id };
      }
    }

    return { success: true, message: "Webhook received" };
  }
}
