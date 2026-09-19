const TRANSIENT_NETWORK_PATTERN = /networkerror|failed to fetch|network request failed|load failed|fetch resource/i;

export function isTransientNetworkError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  return TRANSIENT_NETWORK_PATTERN.test(message);
}

export function networkRetryDelay(attempt: number) {
  return Math.min(750 * 2 ** attempt, 4_000);
}
