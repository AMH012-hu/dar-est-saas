import { randomInt } from "node:crypto";

export const LICENSE_KEY_LENGTH = 56;
const ALPHANUMERIC = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/**
 * Creates a 56-character key using cryptographically secure random integers.
 * The database unique constraint is the final concurrency-safe guarantee.
 */
export function generateLicenseKey(): string {
  let key = "";
  for (let index = 0; index < LICENSE_KEY_LENGTH; index += 1) {
    key += ALPHANUMERIC[randomInt(0, ALPHANUMERIC.length)];
  }
  return key;
}

export function isValidLicenseKey(value: string): boolean {
  return new RegExp(`^[A-Za-z0-9]{${LICENSE_KEY_LENGTH}}$`).test(value);
}
