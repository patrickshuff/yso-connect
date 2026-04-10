import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guardians } from "@/db/schema";

const INVITE_TOKEN_EXPIRY_DAYS = 7;

/**
 * Generates a cryptographically random invite token.
 * The token is a 64-character hex string stored in the guardian record.
 */
export function generateInviteToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Returns the expiry timestamp for a freshly generated invite token.
 */
export function getInviteTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + INVITE_TOKEN_EXPIRY_DAYS);
  return expiry;
}

type InviteTokenStatus = "valid" | "not_found" | "expired" | "claimed";

/**
 * Looks up a guardian by invite token and returns the validation status.
 */
export async function findGuardianByInviteToken(token: string): Promise<
  | { guardian: typeof guardians.$inferSelect; status: "valid" }
  | { guardian: null; status: Exclude<InviteTokenStatus, "valid"> }
> {
  const [guardian] = await db
    .select()
    .from(guardians)
    .where(eq(guardians.inviteToken, token));

  if (!guardian) {
    return { guardian: null, status: "not_found" };
  }

  // Already claimed — account is linked to a Clerk user
  if (guardian.clerkUserId) {
    return { guardian: null, status: "claimed" };
  }

  // Token has expired
  if (
    guardian.inviteTokenExpiresAt &&
    guardian.inviteTokenExpiresAt < new Date()
  ) {
    return { guardian: null, status: "expired" };
  }

  return { guardian, status: "valid" };
}

/**
 * Claims a guardian account by linking a Clerk user ID to the guardian record.
 *
 * Flow:
 * 1. Admin creates a guardian record (invite token generated and stored in DB)
 * 2. Admin email triggers invite link containing the token
 * 3. Guardian clicks the link, lands on /invite/[token], sets a cookie
 * 4. Guardian signs up or signs in via Clerk
 * 5. After auth, /api/claim-guardian reads the cookie and calls this function
 *
 * Returns the guardian info on success, or an error description on failure.
 */
export async function claimGuardianAccount(
  token: string,
  clerkUserId: string,
): Promise<
  | { success: true; guardianId: string; organizationId: string }
  | { success: false; error: string }
> {
  const [guardian] = await db
    .select()
    .from(guardians)
    .where(eq(guardians.inviteToken, token));

  if (!guardian) {
    return { success: false, error: "Invite link is invalid" };
  }

  // Idempotent: already claimed by this exact user
  if (guardian.clerkUserId === clerkUserId) {
    return {
      success: true,
      guardianId: guardian.id,
      organizationId: guardian.organizationId,
    };
  }

  // Already claimed by a different user
  if (guardian.clerkUserId) {
    return { success: false, error: "This invite has already been used" };
  }

  // Token has expired
  if (
    guardian.inviteTokenExpiresAt &&
    guardian.inviteTokenExpiresAt < new Date()
  ) {
    return { success: false, error: "Invite link has expired" };
  }

  const [updated] = await db
    .update(guardians)
    .set({ clerkUserId, updatedAt: new Date() })
    .where(eq(guardians.id, guardian.id))
    .returning();

  if (!updated) {
    return { success: false, error: "Failed to claim account" };
  }

  return {
    success: true,
    guardianId: updated.id,
    organizationId: updated.organizationId,
  };
}
