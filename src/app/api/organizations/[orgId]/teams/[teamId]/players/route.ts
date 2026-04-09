import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { teams, players, teamPlayers } from "@/db/schema";
import { requireOrgRole } from "@/lib/auth";

type RouteParams = {
  params: Promise<{ orgId: string; teamId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { orgId, teamId } = await params;
  const roleResult = await requireOrgRole(orgId, "coach");
  if ("error" in roleResult) return roleResult.error;

  const body: unknown = await request.json();
  if (!isAssignPlayerBody(body)) {
    return NextResponse.json(
      { error: "playerId is required" },
      { status: 400 },
    );
  }

  // Validate team belongs to org
  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.organizationId, orgId)));

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Validate player belongs to org
  const [player] = await db
    .select()
    .from(players)
    .where(
      and(
        eq(players.id, body.playerId),
        eq(players.organizationId, orgId),
      ),
    );

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const [record] = await db
    .insert(teamPlayers)
    .values({
      teamId,
      playerId: body.playerId,
    })
    .returning();

  return NextResponse.json(record, { status: 201 });
}

interface AssignPlayerBody {
  playerId: string;
}

function isAssignPlayerBody(body: unknown): body is AssignPlayerBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "playerId" in body &&
    typeof (body as Record<string, unknown>).playerId === "string"
  );
}
