export type GenerateContractInput = {
  requestId: string;
  candidateName: string;
  candidateEmail: string;
  candidateAddress?: string;
  startDate: string;
};

export type GenerateContractOutput = {
  id: string;
  requestId: string;
  status: string;
  pdfS3Url: string;
};
