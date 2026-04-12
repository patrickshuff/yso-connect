import { createHmac, timingSafeEqual } from "crypto";

/**
 * Generate and verify HMAC-signed guardian confirmation tokens.
 * Used for opt-in email confirmation flow — prevents guardian ID
 * enumeration and unauthorized confirmations.
 */

function getSecret(): string {
  const secret =
    process.env.CONFIRMATION_SECRET || process.env.UNSUBSCRIBE_SECRET;
  if (!secret) {
    throw new Error(
      "CONFIRMATION_SECRET or UNSUBSCRIBE_SECRET environment variable is required",
    );
  }
  return secret;
}

/** Create an HMAC signature for a guardian ID. */
export function signConfirmationToken(guardianId: string): string {
  const hmac = createHmac("sha256", getSecret());
  hmac.update(`confirm:${guardianId}`);
  return hmac.digest("hex");
}

/** Verify that a token matches the expected HMAC for a guardian ID. */
export function verifyConfirmationToken(
  guardianId: string,
  token: string,
): boolean {
  const expected = signConfirmationToken(guardianId);
  if (expected.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

/** Build a signed confirmation URL. */
export function buildConfirmationUrl(
  appUrl: string,
  guardianId: string,
): string {
  const token = signConfirmationToken(guardianId);
  return `${appUrl}/guardian/confirm?g=${guardianId}&t=${token}`;
}
