import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { teams, players, teamPlayers } from "@/db/schema";
import { requireOrgRole } from "@/lib/auth";

type RouteParams = {
  params: Promise<{ orgId: string; teamId: string; playerId: string }>;
};

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { orgId, teamId, playerId } = await params;
  const roleResult = await requireOrgRole(orgId, "coach");
  if ("error" in roleResult) return roleResult.error;

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
    .where(and(eq(players.id, playerId), eq(players.organizationId, orgId)));

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const [record] = await db
    .delete(teamPlayers)
    .where(
      and(
        eq(teamPlayers.teamId, teamId),
        eq(teamPlayers.playerId, playerId),
      ),
    )
    .returning();

  if (!record) {
    return NextResponse.json(
      { error: "Team-player assignment not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ deleted: true });
}
