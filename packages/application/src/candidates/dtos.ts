export type UploadCVInput = {
  requestId: string;
  candidateName: string;
  candidateEmail: string;
  cvFile: Buffer;
};

export type UploadCVOutput = {
  candidateId: string;
  cvUrl: string;
};

export type SelectCandidateInput = {
  requestId: string;
  candidateId: string;
};

export type SelectCandidateOutput = {
  success: boolean;
  candidate: {
    name: string;
    email: string;
    cvUrl: string;
  };
};
