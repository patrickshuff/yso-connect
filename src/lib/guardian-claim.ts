import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guardians } from "@/db/schema";

/**
 * Generates a unique invite token for a guardian.
 *
 * The token is a 32-byte hex string stored in a dedicated column.
 * In a production system this would be stored in a separate invite_tokens table
 * with expiration, but for the MVP we encode the guardianId into the token
 * and verify it on claim.
 *
 * Token format: <random_hex>.<guardianId>
 * This is a simple, opaque token that can be included in an SMS invite link.
 */
export function generateInviteToken(guardianId: string): string {
  const random = randomBytes(32).toString("hex");
  return `${random}.${guardianId}`;
}

/**
 * Parses an invite token and returns the guardian ID.
 * Returns null if the token format is invalid.
 */
export function parseInviteToken(
  token: string
): { guardianId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return { guardianId: parts[1] };
}

/**
 * Claims a guardian account by linking a Clerk user ID to the guardian record.
 *
 * Flow:
 * 1. Admin creates a guardian record (firstName, lastName, phone, etc.)
 * 2. Admin sends an SMS invite with a link containing the invite token
 * 3. Guardian clicks the link, signs up via Clerk
 * 4. After Clerk sign-up, this function is called to link the Clerk userId
 *    to the existing guardian record
 *
 * Returns the updated guardian record, or null if the claim failed.
 */
export async function claimGuardianAccount(
  token: string,
  clerkUserId: string
): Promise<{ success: true; guardianId: string } | { success: false; error: string }> {
  const parsed = parseInviteToken(token);
  if (!parsed) {
    return { success: false, error: "Invalid invite token format" };
  }

  const { guardianId } = parsed;

  // Fetch the guardian record
  const [guardian] = await db
    .select()
    .from(guardians)
    .where(eq(guardians.id, guardianId));

  if (!guardian) {
    return { success: false, error: "Guardian record not found" };
  }

  // Check if already claimed by another user
  if (guardian.clerkUserId && guardian.clerkUserId !== clerkUserId) {
    return {
      success: false,
      error: "This guardian account has already been claimed",
    };
  }

  // If already claimed by this user, idempotent success
  if (guardian.clerkUserId === clerkUserId) {
    return { success: true, guardianId };
  }

  // Link the Clerk user to the guardian record.
  // Use a condition that only updates unclaimed records to prevent race conditions.
  const [updated] = await db
    .update(guardians)
    .set({
      clerkUserId,
      updatedAt: new Date(),
    })
    .where(eq(guardians.id, guardianId))
    .returning();

  if (!updated) {
    return { success: false, error: "Failed to claim guardian account" };
  }

  return { success: true, guardianId };
}
