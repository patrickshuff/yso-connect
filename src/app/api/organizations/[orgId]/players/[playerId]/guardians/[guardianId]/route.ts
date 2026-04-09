import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { players, guardians, playerGuardians } from "@/db/schema";
import { requireOrgRole } from "@/lib/auth";

type RouteParams = {
  params: Promise<{ orgId: string; playerId: string; guardianId: string }>;
};

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { orgId, playerId, guardianId } = await params;
  const roleResult = await requireOrgRole(orgId, "admin");
  if ("error" in roleResult) return roleResult.error;

  // Validate player belongs to org
  const [player] = await db
    .select()
    .from(players)
    .where(and(eq(players.id, playerId), eq(players.organizationId, orgId)));

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  // Validate guardian belongs to org
  const [guardian] = await db
    .select()
    .from(guardians)
    .where(
      and(eq(guardians.id, guardianId), eq(guardians.organizationId, orgId)),
    );

  if (!guardian) {
    return NextResponse.json({ error: "Guardian not found" }, { status: 404 });
  }

  const [record] = await db
    .delete(playerGuardians)
    .where(
      and(
        eq(playerGuardians.playerId, playerId),
        eq(playerGuardians.guardianId, guardianId),
      ),
    )
    .returning();

  if (!record) {
    return NextResponse.json(
      { error: "Player-guardian link not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ deleted: true });
}
