export type HandleDocusignWebhookInput = {
  event: string;
  data: {
    envelopeId: string;
    status: string;
  };
};

export type HandleDocusignWebhookOutput = {
  success: boolean;
  contractId?: string;
  message?: string;
};
