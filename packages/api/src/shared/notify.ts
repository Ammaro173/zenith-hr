export type NotificationPayload = {
  userId: string;
  message: string;
};

// Placeholder notification hook - replace with email/in-app provider
export function notifyUser(payload: NotificationPayload): void {
  // eslint-disable-next-line no-console
  console.log("[notify]", payload.userId, payload.message);
}
