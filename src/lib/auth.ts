import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  getMembership,
  getUserOrganizations,
  requireRole,
  AuthorizationError,
  type MembershipRole,
} from "./memberships";

/**
 * Get the current authenticated user's Clerk ID or return a 401 response.
 */
export async function getAuthUserId(): Promise<
  { userId: string } | { error: NextResponse }
> {
  const { userId } = await auth();
  if (!userId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { userId };
}

/**
 * Get the current user's membership for a specific org.
 * Returns null if user has no membership.
 */
export async function getCurrentUserMembership(orgId: string) {
  const result = await getAuthUserId();
  if ("error" in result) return null;
  return getMembership(orgId, result.userId);
}

/**
 * Get all organizations the current user belongs to.
 */
export async function getCurrentUserOrganizations() {
  const result = await getAuthUserId();
  if ("error" in result) return [];
  return getUserOrganizations(result.userId);
}

/**
 * Check if the current user has at least the required role in an org.
 * Returns the membership if authorized, or a NextResponse error.
 */
export async function requireOrgRole(
  orgId: string,
  minimumRole: MembershipRole,
): Promise<
  | { membership: Awaited<ReturnType<typeof getMembership>>; userId: string }
  | { error: NextResponse }
> {
  const authResult = await getAuthUserId();
  if ("error" in authResult) return authResult;

  try {
    const membership = await requireRole(
      orgId,
      authResult.userId,
      minimumRole,
    );
    return { membership, userId: authResult.userId };
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return {
        error: NextResponse.json(
          { error: e.message },
          { status: e.statusCode },
        ),
      };
    }
    throw e;
  }
}
