import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { teams, seasons, divisions } from "@/db/schema";
import { requireOrgRole } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const roleResult = await requireOrgRole(orgId, "coach");
  if ("error" in roleResult) return roleResult.error;

  const orgTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.organizationId, orgId));

  return NextResponse.json(orgTeams);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const roleResult = await requireOrgRole(orgId, "admin");
  if ("error" in roleResult) return roleResult.error;

  const body: unknown = await request.json();
  if (!isCreateTeamBody(body)) {
    return NextResponse.json(
      { error: "name and seasonId are required" },
      { status: 400 },
    );
  }

  const [season] = await db
    .select({ id: seasons.id })
    .from(seasons)
    .where(and(eq(seasons.id, body.seasonId), eq(seasons.organizationId, orgId)));

  if (!season) {
    return NextResponse.json(
      { error: "Season not found in this organization" },
      { status: 400 },
    );
  }

  if (body.divisionId) {
    const [division] = await db
      .select({ id: divisions.id })
      .from(divisions)
      .where(and(eq(divisions.id, body.divisionId), eq(divisions.organizationId, orgId)));

    if (!division) {
      return NextResponse.json(
        { error: "Division not found in this organization" },
        { status: 400 },
      );
    }
  }

  const [team] = await db
    .insert(teams)
    .values({
      organizationId: orgId,
      name: body.name,
      seasonId: body.seasonId,
      divisionId: body.divisionId ?? null,
    })
    .returning();

  return NextResponse.json(team, { status: 201 });
}

interface CreateTeamBody {
  name: string;
  seasonId: string;
  divisionId?: string;
}

function isCreateTeamBody(body: unknown): body is CreateTeamBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    typeof (body as Record<string, unknown>).name === "string" &&
    "seasonId" in body &&
    typeof (body as Record<string, unknown>).seasonId === "string"
  );
}
