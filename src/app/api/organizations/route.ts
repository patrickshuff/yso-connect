import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { getAuthUserId } from "@/lib/auth";
import { createMembership, getUserOrganizations } from "@/lib/memberships";

export async function GET() {
  const authResult = await getAuthUserId();
  if ("error" in authResult) return authResult.error;

  const orgs = await getUserOrganizations(authResult.userId);
  return NextResponse.json(orgs);
}

export async function POST(request: NextRequest) {
  const authResult = await getAuthUserId();
  if ("error" in authResult) return authResult.error;

  const body: unknown = await request.json();
  if (!isCreateOrgBody(body)) {
    return NextResponse.json(
      { error: "name and slug are required" },
      { status: 400 },
    );
  }

  const [org] = await db
    .insert(organizations)
    .values({
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,
      logoUrl: body.logoUrl ?? null,
      websiteUrl: body.websiteUrl ?? null,
      contactEmail: body.contactEmail ?? null,
      contactPhone: body.contactPhone ?? null,
      timezone: body.timezone ?? "America/New_York",
    })
    .returning();

  await createMembership(org.id, authResult.userId, "owner");

  return NextResponse.json(org, { status: 201 });
}

interface CreateOrgBody {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  timezone?: string;
}

function isCreateOrgBody(body: unknown): body is CreateOrgBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    typeof (body as Record<string, unknown>).name === "string" &&
    "slug" in body &&
    typeof (body as Record<string, unknown>).slug === "string"
  );
}
