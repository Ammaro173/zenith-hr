export type ContractTerms = {
  salary: number;
  currency: string;
  startDate: string;
  positionTitle: string;
};

export type Contract = {
  id: string;
  requestId: string;
  candidateName: string;
  candidateEmail: string;
  contractTerms: ContractTerms;
  pdfS3Url: string;
  status: "DRAFT" | "SENT_FOR_SIGNATURE" | "SIGNED";
  signingProviderId?: string;
  createdAt?: Date;
  updatedAt?: Date;
};
