import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { guardians, playerGuardians, players } from "@/db/schema";
import { requireOrgRole } from "@/lib/auth";

type RouteParams = {
  params: Promise<{ orgId: string; guardianId: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { orgId, guardianId } = await params;
  const roleResult = await requireOrgRole(orgId, "coach");
  if ("error" in roleResult) return roleResult.error;

  const [guardian] = await db
    .select()
    .from(guardians)
    .where(
      and(eq(guardians.id, guardianId), eq(guardians.organizationId, orgId)),
    );

  if (!guardian) {
    return NextResponse.json({ error: "Guardian not found" }, { status: 404 });
  }

  const playerLinks = await db
    .select({
      playerId: playerGuardians.playerId,
      relationship: playerGuardians.relationship,
      isPrimary: playerGuardians.isPrimary,
      player: players,
    })
    .from(playerGuardians)
    .innerJoin(players, eq(playerGuardians.playerId, players.id))
    .where(eq(playerGuardians.guardianId, guardianId));

  return NextResponse.json({
    ...guardian,
    players: playerLinks.map((link) => ({
      ...link.player,
      relationship: link.relationship,
      isPrimary: link.isPrimary,
    })),
  });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { orgId, guardianId } = await params;
  const roleResult = await requireOrgRole(orgId, "admin");
  if ("error" in roleResult) return roleResult.error;

  const body = (await request.json()) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  for (const field of [
    "firstName",
    "lastName",
    "email",
    "phone",
    "preferredContact",
    "clerkUserId",
  ] as const) {
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

  const [guardian] = await db
    .update(guardians)
    .set(updates)
    .where(
      and(eq(guardians.id, guardianId), eq(guardians.organizationId, orgId)),
    )
    .returning();

  if (!guardian) {
    return NextResponse.json({ error: "Guardian not found" }, { status: 404 });
  }

  return NextResponse.json(guardian);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { orgId, guardianId } = await params;
  const roleResult = await requireOrgRole(orgId, "admin");
  if ("error" in roleResult) return roleResult.error;

  const [guardian] = await db
    .delete(guardians)
    .where(
      and(eq(guardians.id, guardianId), eq(guardians.organizationId, orgId)),
    )
    .returning();

  if (!guardian) {
    return NextResponse.json({ error: "Guardian not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
