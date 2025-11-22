export type GeneratePdfParams = {
  requestCode: string;
  positionTitle: string;
  salary: number;
  currency: string;
  candidateName: string;
  candidateEmail: string;
  candidateAddress?: string;
  startDate: string;
};

export type IPdfService = {
  generateContractPdf(params: GeneratePdfParams): Promise<Buffer>;
};

export type IStorageService = {
  upload(key: string, data: Buffer): Promise<string>;
  getPresignedUrl(key: string): Promise<string>;
};
