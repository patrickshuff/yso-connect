import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { teams } from "@/db/schema";
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
