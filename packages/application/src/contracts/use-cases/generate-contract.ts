import type {
  Contract,
  IContractRepository,
  IPdfService,
  IStorageService,
} from "@zenith-hr/domain/contracts";
import { v4 as uuidv4 } from "uuid";
import type { GenerateContractInput, GenerateContractOutput } from "../dtos";

export class GenerateContractUseCase {
  private readonly contractRepository: IContractRepository;
  private readonly pdfService: IPdfService;
  private readonly storageService: IStorageService;

  constructor(
    contractRepository: IContractRepository,
    pdfService: IPdfService,
    storageService: IStorageService
  ) {
    this.contractRepository = contractRepository;
    this.pdfService = pdfService;
    this.storageService = storageService;
  }

  async execute(
    input: GenerateContractInput,
    requestDetails: {
      requestCode: string;
      positionTitle: string;
      salary: number;
      currency: string;
    }
  ): Promise<GenerateContractOutput> {
    // 1. Generate PDF
    const pdfBuffer = await this.pdfService.generateContractPdf({
      requestCode: requestDetails.requestCode,
      positionTitle: requestDetails.positionTitle,
      salary: requestDetails.salary,
      currency: requestDetails.currency,
      candidateName: input.candidateName,
      candidateEmail: input.candidateEmail,
      candidateAddress: input.candidateAddress,
      startDate: input.startDate,
    });

    // 2. Upload to Storage
    const contractId = uuidv4();
    const s3Key = `contracts/${contractId}.pdf`;
    const s3Url = await this.storageService.upload(s3Key, pdfBuffer);

    // 3. Create Contract Entity
    const contract: Contract = {
      id: contractId,
      requestId: input.requestId,
      candidateName: input.candidateName,
      candidateEmail: input.candidateEmail,
      contractTerms: {
        salary: requestDetails.salary,
        currency: requestDetails.currency,
        startDate: input.startDate,
        positionTitle: requestDetails.positionTitle,
      },
      pdfS3Url: s3Url,
      status: "DRAFT",
    };

    // 4. Save to Repository
    const savedContract = await this.contractRepository.create(contract);

    return {
      id: savedContract.id,
      requestId: savedContract.requestId,
      status: savedContract.status,
      pdfS3Url: savedContract.pdfS3Url,
    };
  }
}
