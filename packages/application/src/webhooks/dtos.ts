export interface HandleDocusignWebhookInput {
  event: string;
  data: {
    envelopeId: string;
    status: string;
  };
}

export interface HandleDocusignWebhookOutput {
  success: boolean;
  contractId?: string;
  message?: string;
}
