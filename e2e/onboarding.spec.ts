import { test, expect, type Page } from "@playwright/test";
import { createSignInTokenUrl, findUserByPhone } from "./helpers/clerk";

/**
 * Onboarding E2E tests for YSO Connect.
 *
 * This test covers:
 * 1. Sign-in (using Clerk backend tokens for speed and reliability)
 * 2. Organization creation (Step 1)
 * 3. Season creation (Step 2)
 * 4. Sports addition (Step 3)
 * 5. Dashboard verification (Step 4 and beyond)
 */

function getPhoneNumber(): string {
  const phone = process.env.E2E_PHONE_NUMBER;
  if (!phone) {
    throw new Error("E2E_PHONE_NUMBER environment variable is required");
  }
  return phone;
}

async function signIn(page: Page): Promise<void> {
  const phoneE164 = getPhoneNumber();

  // Resolve the Clerk user ID from the phone number
  const userId = await findUserByPhone(phoneE164);
  if (!userId) {
    throw new Error(
      `No Clerk user found for phone ${phoneE164}. ` +
        "Register this number in the app before running E2E tests.",
    );
  }

  // Create a magic sign-in URL via the Clerk Backend API
  const signInUrl = await createSignInTokenUrl(userId);

  // Navigate to the magic URL — Clerk processes the ticket and redirects
  // to the after-sign-in URL (/dashboard) automatically.
  await page.goto(signInUrl);

  // Should end up on /dashboard after successful token sign-in
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
}

test.describe("Onboarding flow", () => {
  test("complete onboarding: create org, season, and sports", async ({ page }) => {
    await signIn(page);

    // If the user already has an org, they are redirected to /dashboard/[orgId]
    // To ensure we can test the onboarding flow, we go to /dashboard directly.
    // If the user has an org, the /dashboard page will show the "How would you like to get started?"
    // cards if it's hit directly and organizations exist but we want to start a NEW one.
    // Actually, DashboardPage redirects if orgs.length > 0.
    // If we want to test onboarding, we might need to go to /dashboard/onboarding directly
    // or use a user without an organization.
    
    await page.goto("/dashboard/onboarding");
    await expect(page.getByText("Set Up Your Organization")).toBeVisible();

    // Step 1: Organization
    const timestamp = Date.now();
    const orgName = `Test Org ${timestamp}`;
    await page.getByLabel("Organization Name *").fill(orgName);
    // Slug is auto-filled
    await page.getByLabel("Description").fill("Automated E2E test organization");
    await page.getByLabel("Contact Email").fill(`test-${timestamp}@example.com`);
    
    const nextButton = page.getByRole("button", { name: "Next: Create Season" });
    await nextButton.click();

    // Step 2: Season
    await expect(page.getByText("Create First Season")).toBeVisible();
    await page.getByLabel("Season Name *").fill("Spring 2026");
    await page.getByLabel("Start Date *").fill("2026-03-01");
    await page.getByLabel("End Date *").fill("2026-06-30");
    
    const nextSeasonButton = page.getByRole("button", { name: "Next: Add Sports" });
    await nextSeasonButton.click();

    // Step 3: Sports
    await expect(page.getByText("Add Sports")).toBeVisible();
    const sportInput = page.getByPlaceholder("e.g. Baseball, Soccer, Basketball");
    await sportInput.fill("Soccer");
    await page.getByRole("button", { name: "Add" }).click();
    
    await expect(page.getByText("Soccer")).toBeVisible();
    
    const finishButton = page.getByRole("button", { name: "Finish Setup" });
    await finishButton.click();

    // Step 4: Summary
    await expect(page.getByText("You're All Set!")).toBeVisible();
    await expect(page.getByText(orgName)).toBeVisible();
    await expect(page.getByText("Spring 2026")).toBeVisible();

    const goToDashboardButton = page.getByRole("button", { name: "Go to Dashboard" });
    await goToDashboardButton.click();

    // Should redirect to /dashboard/[orgId]
    await page.waitForURL(/\/dashboard\/[a-zA-Z0-9-]+/);
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();
    
    // Verify the org name is in the sidebar or header if possible, 
    // but the overview page just says "Overview".
    // We already verified we are on the org dashboard.
  });

  test("create team: add a new team to the organization", async ({ page }) => {
    // This test runs after the onboarding test in the same worker, 
    // so we should already be on the organization dashboard.
    // If not, we sign in and go to the first org.
    await signIn(page);
    
    // Ensure we are on an organization dashboard
    if (!page.url().match(/\/dashboard\/[a-zA-Z0-9-]+/)) {
      await page.goto("/dashboard");
      // If we have orgs, DashboardPage redirects us to the first one.
      // Wait for it.
      await page.waitForURL(/\/dashboard\/[a-zA-Z0-9-]+/, { timeout: 10_000 });
    }

    // Click "Add Team" from the Overview page (links to /teams)
    await page.getByRole("link", { name: "Add Team" }).click();
    await page.waitForURL(/\/dashboard\/[a-zA-Z0-9-]+\/teams/);

    // Click "Add Team" button on the Teams page to open the dialog
    await page.getByRole("button", { name: "Add Team" }).click();
    await expect(page.getByRole("heading", { name: "Add Team" })).toBeVisible();

    const teamName = `Blue Jays ${Date.now()}`;
    await page.getByLabel("Team Name").fill(teamName);
    await page.getByLabel("Sport").selectOption("Soccer");
    await page.getByLabel("Season").selectOption({ index: 1 }); // Select the first available season

    await page.getByRole("button", { name: "Create Team" }).click();

    // Dialog should close and team should appear in the list
    await expect(page.getByRole("heading", { name: "Add Team" })).not.toBeVisible();
    
    // Find the card containing our new team and verify its sport
    const teamCard = page.locator('[data-slot="card"]').filter({ hasText: teamName }).first();
    await expect(teamCard).toBeVisible();
    await expect(teamCard.getByText("Soccer")).toBeVisible();
  });
});
