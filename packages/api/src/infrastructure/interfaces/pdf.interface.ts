/**
 * PDF Service Type
 * Abstraction for PDF generation and manipulation
 */
export interface PdfService {
  /**
   * Generate a contract PDF document
   * @param params - Contract details for PDF generation
   * @returns The generated PDF as a Buffer
   */
  generateContractPdf: (params: GenerateContractParams) => Promise<Buffer>;
}

export interface GenerateContractParams {
  candidateAddress?: string;
  candidateEmail: string;
  candidateName: string;
  currency: string;
  positionTitle: string;
  requestCode: string;
  salary: number;
  startDate: string;
}
