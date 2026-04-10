"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { organizations, seasons, sports } from "@/db/schema";
import { createMembership, requireRole } from "@/lib/memberships";

interface CreateOrgResult {
  success: boolean;
  orgId?: string;
  error?: string;
}

export async function createOrganization(formData: FormData): Promise<CreateOrgResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const name = formData.get("name") as string | null;
  const slug = formData.get("slug") as string | null;
  const description = formData.get("description") as string | null;
  const contactEmail = formData.get("contactEmail") as string | null;
  const contactPhone = formData.get("contactPhone") as string | null;
  const timezone = (formData.get("timezone") as string | null) ?? "America/New_York";

  if (!name || !slug) {
    return { success: false, error: "Name and slug are required" };
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 30);

  const [org] = await db
    .insert(organizations)
    .values({
      name,
      slug,
      description: description || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      timezone,
      trialEndsAt,
      subscriptionStatus: "trial",
    })
    .returning();

  await createMembership(org.id, userId, "owner");

  return { success: true, orgId: org.id };
}

interface CreateSeasonResult {
  success: boolean;
  seasonId?: string;
  error?: string;
}

export async function createSeason(formData: FormData): Promise<CreateSeasonResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const orgId = formData.get("orgId") as string | null;
  const name = formData.get("name") as string | null;
  const startDate = formData.get("startDate") as string | null;
  const endDate = formData.get("endDate") as string | null;

  if (!orgId || !name || !startDate || !endDate) {
    return { success: false, error: "All fields are required" };
  }

  await requireRole(orgId, userId, "admin");

  const [season] = await db
    .insert(seasons)
    .values({
      organizationId: orgId,
      name,
      startDate,
      endDate,
      isActive: true,
    })
    .returning();

  return { success: true, seasonId: season.id };
}

interface AddSportsResult {
  success: boolean;
  sportIds?: string[];
  error?: string;
}

export async function addSports(orgId: string, sportNames: string[]): Promise<AddSportsResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  if (!orgId || sportNames.length === 0) {
    return { success: false, error: "Organization ID and at least one sport are required" };
  }

  await requireRole(orgId, userId, "admin");

  const inserted = await db
    .insert(sports)
    .values(
      sportNames.map((name) => ({
        organizationId: orgId,
        name,
      })),
    )
    .returning();

  return { success: true, sportIds: inserted.map((s) => s.id) };
}
