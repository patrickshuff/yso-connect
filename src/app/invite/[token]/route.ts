import { type NextRequest, NextResponse } from "next/server";
import { findGuardianByInviteToken } from "@/lib/guardian-claim";
import { logger } from "@/lib/logger";

// Cookie name used throughout the invite claim flow.
// Must match the name read in /api/claim-guardian/route.ts.
export const GUARDIAN_INVITE_COOKIE = "guardian_invite_token";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const result = await findGuardianByInviteToken(token);
  logger.info("Guardian invite token lookup", {
    status: result.status,
    guardianId: result.status === "valid" ? result.guardian.id : undefined,
  });

  if (result.status === "not_found") {
    return NextResponse.redirect(new URL("/invite/invalid", request.url));
  }

  if (result.status === "expired") {
    return NextResponse.redirect(new URL("/invite/expired", request.url));
  }

  if (result.status === "claimed") {
    // Account already set up — send to sign-in
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Valid token: set a short-lived cookie and send guardian to sign-up
  const response = NextResponse.redirect(new URL("/sign-up", request.url));
  response.cookies.set(GUARDIAN_INVITE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // 24 hours — enough time to complete sign-up; token itself has a 7-day expiry
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  return response;
}
