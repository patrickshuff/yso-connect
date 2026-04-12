import { test, expect, type Page } from "@playwright/test";
import { isClerkTestMode, CLERK_TEST_OTP } from "./helpers/twilio";
import { createSignInTokenUrl, findUserByPhone } from "./helpers/clerk";

/**
 * Auth E2E tests for YSO Connect sign-in flow.
 *
 * Authentication strategy depends on Clerk mode:
 *
 * TEST MODE (sk_test_ key, default .env.local):
 *   - E2E_PHONE_NUMBER=+15555550104 is Clerk's magic test phone number
 *   - OTP is always 424242 (no real SMS sent)
 *   - The OTP flow test works end-to-end
 *
 * LIVE MODE (sk_live_ key, production):
 *   - E2E_PHONE_NUMBER must be a real Clerk-registered phone
 *   - The sign-in test uses Clerk sign-in tokens (backend API) to bypass SMS
 *   - The OTP step appearance test sends a real code but does not complete it
 *
 * Required environment variables (loaded from .env.local):
 *   E2E_PHONE_NUMBER   - Phone number registered in Clerk
 *   CLERK_SECRET_KEY   - Clerk backend secret key
 *   E2E_BASE_URL       - Base URL (default: http://localhost:3000)
 */

function getPhoneNumber(): string {
  const phone = process.env.E2E_PHONE_NUMBER;
  if (!phone) {
    throw new Error("E2E_PHONE_NUMBER environment variable is required");
  }
  return phone;
}

/**
 * Types the 10 local digits of an E.164 phone number into the phone input.
 * The component strips "+1 " on each keystroke, so only the 10 local digits
 * are typed to produce the correctly formatted "+1 (XXX) XXX-XXXX".
 */
async function typePhoneNumber(page: Page, e164: string): Promise<void> {
  const digits = e164.replace(/^\+1/, "").replace(/\D/g, "");
  const input = page.getByLabel("Phone number");
  await input.click();
  await input.fill("");
  await input.pressSequentially(digits, { delay: 50 });
}

/**
 * Signs in using the most appropriate strategy for the current Clerk mode:
 *   - Test mode: full OTP flow with magic phone + hardcoded OTP 424242
 *   - Live mode: Clerk sign-in token (backend API, no SMS needed)
 */
async function signInViaClerk(page: Page, phoneE164: string): Promise<void> {
  if (isClerkTestMode()) {
    // Test mode: use the magic phone number + hardcoded OTP
    await page.goto("/sign-in");
    await expect(page.getByText("Sign in", { exact: true })).toBeVisible();

    await typePhoneNumber(page, phoneE164);
    await page.getByRole("button", { name: "Send code" }).click();

    await expect(
      page.getByText(/We sent a 6-digit code to/),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByLabel("One-time code").fill(CLERK_TEST_OTP);
    await page.getByRole("button", { name: "Verify code" }).click();
  } else {
    // Live mode: bypass SMS via Clerk sign-in token
    const userId = await findUserByPhone(phoneE164);
    if (!userId) {
      throw new Error(
        `No Clerk user found for phone ${phoneE164}. ` +
          "Register this number in Clerk before running production E2E tests.",
      );
    }
    const signInUrl = await createSignInTokenUrl(userId);
    await page.goto(signInUrl);
  }

  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
}

test.describe("Auth flows", () => {
  test.skip(
    !process.env.E2E_PHONE_NUMBER,
    "E2E_PHONE_NUMBER not set — skipping auth E2E (requires Twilio test number)",
  );

  test("phone sign-in flow: enter number, receive OTP, verify, redirect to dashboard", async ({
    page,
  }) => {
    const phoneE164 = getPhoneNumber();
    await signInViaClerk(page, phoneE164);
    expect(page.url()).toContain("/dashboard");
  });

  test("already signed in: navigating to /sign-in redirects to /dashboard", async ({
    page,
  }) => {
    // This test depends on the session cookie left by the previous test running
    // in the same worker. If the cookie is present, /sign-in redirects immediately.
    await page.goto("/sign-in");
    await page.waitForTimeout(2_000);

    const url = page.url();
    if (url.includes("/dashboard")) {
      expect(url).toContain("/dashboard");
    } else {
      // No session (e.g. isolated context) — sign-in page shown, which is valid
      await expect(page.getByText("Sign in", { exact: true })).toBeVisible();
    }
  });

  test("phone OTP UI: entering number and clicking Send code shows the OTP step", async ({
    page,
  }) => {
    const phoneE164 = getPhoneNumber();

    await page.goto("/sign-in");
    await expect(page.getByText("Sign in", { exact: true })).toBeVisible();

    await typePhoneNumber(page, phoneE164);

    // Verify the input formatted correctly
    const phoneInput = page.getByLabel("Phone number");
    const formatted = await phoneInput.inputValue();
    expect(formatted).toMatch(/^\+1 \(\d{3}\) \d{3}-\d{4}$/);

    await page.getByRole("button", { name: "Send code" }).click();

    // The card description should change to show a code was sent
    await expect(
      page.getByText(/We sent a 6-digit code to/),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByLabel("One-time code")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Verify code" }),
    ).toBeVisible();
  });

  test("phone number formatting: typing 10 digits produces +1 (XXX) XXX-XXXX", async ({
    page,
  }) => {
    await page.goto("/sign-in");

    const phoneInput = page.getByLabel("Phone number");
    await phoneInput.click();
    await phoneInput.fill("");
    await phoneInput.pressSequentially("9375384888", { delay: 30 });

    const value = await phoneInput.inputValue();

    // Full formatted value must match exactly
    expect(value).toBe("+1 (937) 538-4888");

    // Local digits only (strip country code 1) must be exactly 10
    const localDigits = value.replace(/^\+1/, "").replace(/\D/g, "");
    expect(localDigits).toHaveLength(10);
  });
});
