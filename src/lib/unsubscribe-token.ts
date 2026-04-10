import { createHmac, timingSafeEqual } from "crypto";

/**
 * Generate and verify HMAC-signed unsubscribe tokens.
 * Prevents guardian ID enumeration and unauthorized unsubscribes.
 */

function getSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) {
    throw new Error("UNSUBSCRIBE_SECRET environment variable is required");
  }
  return secret;
}

/** Create an HMAC signature for a guardian ID. */
export function signUnsubscribeToken(guardianId: string): string {
  const hmac = createHmac("sha256", getSecret());
  hmac.update(guardianId);
  return hmac.digest("hex");
}

/** Verify that a token matches the expected HMAC for a guardian ID. */
export function verifyUnsubscribeToken(guardianId: string, token: string): boolean {
  const expected = signUnsubscribeToken(guardianId);
  if (expected.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

/** Build a signed unsubscribe URL. */
export function buildUnsubscribeUrl(appUrl: string, guardianId: string): string {
  const token = signUnsubscribeToken(guardianId);
  return `${appUrl}/api/unsubscribe?g=${guardianId}&t=${token}`;
}
