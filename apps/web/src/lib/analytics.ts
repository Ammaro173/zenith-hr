type AnalyticsClient = {
  track?: (event: string, payload?: Record<string, unknown>) => void;
};

declare global {
  // biome-ignore lint/style/useConsistentTypeDefinitions: biome is dumb
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
