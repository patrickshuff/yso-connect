import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { players, playerGuardians, guardians } from "@/db/schema";
import { requireOrgRole } from "@/lib/auth";

type RouteParams = { params: Promise<{ orgId: string; playerId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { orgId, playerId } = await params;
  const roleResult = await requireOrgRole(orgId, "coach");
  if ("error" in roleResult) return roleResult.error;

  const [player] = await db
    .select()
    .from(players)
    .where(and(eq(players.id, playerId), eq(players.organizationId, orgId)));

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const guardianLinks = await db
    .select({
      guardianId: playerGuardians.guardianId,
      relationship: playerGuardians.relationship,
      isPrimary: playerGuardians.isPrimary,
      guardian: guardians,
    })
    .from(playerGuardians)
    .innerJoin(guardians, eq(playerGuardians.guardianId, guardians.id))
    .where(eq(playerGuardians.playerId, playerId));

  return NextResponse.json({
    ...player,
    guardians: guardianLinks.map((link) => ({
      ...link.guardian,
      relationship: link.relationship,
      isPrimary: link.isPrimary,
    })),
  });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { orgId, playerId } = await params;
  const roleResult = await requireOrgRole(orgId, "admin");
  if ("error" in roleResult) return roleResult.error;

  const body = (await request.json()) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  for (const field of ["firstName", "lastName", "dateOfBirth"] as const) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  updates.updatedAt = new Date();

  const [player] = await db
    .update(players)
    .set(updates)
    .where(and(eq(players.id, playerId), eq(players.organizationId, orgId)))
    .returning();

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  return NextResponse.json(player);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { orgId, playerId } = await params;
  const roleResult = await requireOrgRole(orgId, "admin");
  if ("error" in roleResult) return roleResult.error;

  const [player] = await db
    .delete(players)
    .where(and(eq(players.id, playerId), eq(players.organizationId, orgId)))
    .returning();

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
