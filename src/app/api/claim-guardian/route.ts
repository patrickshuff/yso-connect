import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { claimGuardianAccount } from "@/lib/guardian-claim";
import { logger } from "@/lib/logger";

const GUARDIAN_INVITE_COOKIE = "guardian_invite_token";

/**
 * POST-auth claim handler for the guardian invite flow.
 *
 * Called from /dashboard when a guardian_invite_token cookie is present.
 * Reads the cookie, calls claimGuardianAccount, clears the cookie, and
 * redirects to /dashboard/guardian on success or /invite/invalid on failure.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const token = request.cookies.get(GUARDIAN_INVITE_COOKIE)?.value;
  if (!token) {
    // No token — send back to dashboard for normal routing
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const result = await claimGuardianAccount(token, userId);

  logger.info("Guardian account claim attempt", {
    clerkUserId: userId,
    success: result.success,
    error: result.success ? undefined : result.error,
    guardianId: result.success ? result.guardianId : undefined,
    organizationId: result.success ? result.organizationId : undefined,
  });

  const destination = result.success ? "/dashboard/guardian" : "/invite/invalid";
  const response = NextResponse.redirect(new URL(destination, request.url));

  // Always clear the cookie regardless of success/failure
  response.cookies.delete(GUARDIAN_INVITE_COOKIE);

  return response;
}
