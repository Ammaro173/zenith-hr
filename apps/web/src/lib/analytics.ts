interface AnalyticsClient {
  track?: (event: string, payload?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    analytics?: AnalyticsClient;
  }
}

export function trackEvent(
  event: string,
  payload?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const client = window.analytics;
  client?.track?.(event, payload);
}
