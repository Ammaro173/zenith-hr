export interface UploadCVInput {
  requestId: string;
  candidateName: string;
  candidateEmail: string;
  cvFile: Buffer;
}

export interface UploadCVOutput {
  candidateId: string;
  cvUrl: string;
}

export interface SelectCandidateInput {
  requestId: string;
  candidateId: string;
}

export interface SelectCandidateOutput {
  success: boolean;
  candidate: {
    name: string;
    email: string;
    cvUrl: string;
  };
}
