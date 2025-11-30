/**
 * PDF Service Type
 * Abstraction for PDF generation and manipulation
 */
export type PdfService = {
  /**
   * Generate a contract PDF document
   * @param params - Contract details for PDF generation
   * @returns The generated PDF as a Buffer
   */
  generateContractPdf: (params: GenerateContractParams) => Promise<Buffer>;
};

export type GenerateContractParams = {
  requestCode: string;
  positionTitle: string;
  salary: number;
  currency: string;
  candidateName: string;
  candidateEmail: string;
  candidateAddress?: string;
  startDate: string;
};
