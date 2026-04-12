"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { organizations, seasons, sports, teams } from "@/db/schema";
import { createMembership } from "@/lib/memberships";

interface QuickSetupResult {
  success: boolean;
  orgId?: string;
  error?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function quickSetupTeam(
  teamName: string,
  sportName: string,
  seasonName: string,
): Promise<QuickSetupResult> {
  // treatPendingAsSignedOut: false — new users without a Clerk org have
  // "pending" sessions. We manage our own orgs in DB, so we still need the userId.
  const { userId } = await auth({ treatPendingAsSignedOut: false });
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  if (!teamName.trim()) {
    return { success: false, error: "Team name is required" };
  }

  if (!sportName.trim()) {
    return { success: false, error: "Sport is required" };
  }

  if (!seasonName.trim()) {
    return { success: false, error: "Season name is required" };
  }

  // Default to "Personal" when we have no user name — it's a personal
  // workspace, not "the first team's name"
  const orgName = displayName || "Personal";
  const slug = slugify(orgName) + "-" + Date.now().toString(36);

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 30);

  // Default season dates: today to 3 months from now
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 3);

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  try {
    // Create org, season, sport, team in a transaction
    const result = await db.transaction(async (tx) => {
      const [org] = await tx
        .insert(organizations)
        .values({
          name: orgName,
          slug,
          description: "coach_team",
          trialEndsAt,
          subscriptionStatus: "trial",
        })
        .returning();

      const [season] = await tx
        .insert(seasons)
        .values({
          organizationId: org.id,
          name: seasonName.trim(),
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          isActive: true,
        })
        .returning();

      const [sport] = await tx
        .insert(sports)
        .values({
          organizationId: org.id,
          name: sportName.trim(),
        })
        .returning();

      await tx
        .insert(teams)
        .values({
          organizationId: org.id,
          seasonId: season.id,
          name: teamName.trim(),
          sport: sportName.trim() || null,
        })
        .returning();

      return { orgId: org.id, sportId: sport.id };
    });

    // Create membership outside transaction (uses separate db connection)
    await createMembership(result.orgId, userId, "owner");

    return { success: true, orgId: result.orgId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to set up team";
    return { success: false, error: message };
  }
}
