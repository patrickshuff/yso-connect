/**
 * Clerk authentication helper for E2E tests.
 *
 * Uses the Clerk Backend API to create sign-in tokens, enabling tests to
 * authenticate as a real user without going through the SMS OTP flow.
 *
 * Required environment variables:
 *   CLERK_SECRET_KEY    - Clerk secret key (sk_live_... or sk_test_...)
 *   E2E_CLERK_USER_ID   - The Clerk user ID to authenticate as in tests
 *
 * References:
 *   https://clerk.com/docs/reference/backend-api/tag/Sign-in-Tokens
 */

interface ClerkSignInTokenResponse {
  id: string;
  token: string;
  url: string;
  status: string;
  user_id: string;
}

interface ClerkErrorResponse {
  errors: Array<{ message: string; code: string }>;
}

/**
 * Creates a short-lived Clerk sign-in token for the given user and returns
 * the magic sign-in URL. Navigating to this URL in a browser signs in the
 * user without any OTP challenge.
 */
export async function createSignInTokenUrl(userId: string): Promise<string> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY environment variable is required");
  }

  const response = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      expires_in_seconds: 300,
    }),
  });

  if (!response.ok) {
    const err = (await response.json()) as ClerkErrorResponse;
    const msg = err.errors?.[0]?.message ?? `HTTP ${response.status}`;
    throw new Error(`Clerk sign-in token creation failed: ${msg}`);
  }

  const data = (await response.json()) as ClerkSignInTokenResponse;
  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  const redirectUrl = new URL("/dashboard", baseUrl).toString();
  return `${data.url}&redirect_url=${encodeURIComponent(redirectUrl)}`;
}

/**
 * Looks up a Clerk user by phone number (E.164 format) and returns their ID.
 * Returns null if no user is found.
 */
export async function findUserByPhone(phone: string): Promise<string | null> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY environment variable is required");
  }

  const params = new URLSearchParams({ phone_number: phone, limit: "1" });
  const response = await fetch(
    `https://api.clerk.com/v1/users?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    },
  );

  if (!response.ok) {
    const err = (await response.json()) as ClerkErrorResponse;
    const msg = err.errors?.[0]?.message ?? `HTTP ${response.status}`;
    throw new Error(`Clerk user lookup failed: ${msg}`);
  }

  type ClerkUser = { id: string; phone_numbers: Array<{ phone_number: string }> };
  const users = (await response.json()) as ClerkUser[];
  if (!Array.isArray(users) || users.length === 0) return null;
  return users[0].id;
}
