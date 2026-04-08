import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { players, playerGuardians, guardians } from "@/db/schema";
import { requireOrgRole } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const roleResult = await requireOrgRole(orgId, "coach");
  if ("error" in roleResult) return roleResult.error;

  const orgPlayers = await db
    .select()
    .from(players)
    .where(eq(players.organizationId, orgId));

  const playerIds = orgPlayers.map((p) => p.id);

  if (playerIds.length === 0) {
    return NextResponse.json([]);
  }

  const guardianLinks = await db
    .select({
      playerId: playerGuardians.playerId,
      guardianId: playerGuardians.guardianId,
      relationship: playerGuardians.relationship,
      isPrimary: playerGuardians.isPrimary,
      guardian: guardians,
    })
    .from(playerGuardians)
    .innerJoin(guardians, eq(playerGuardians.guardianId, guardians.id))
    .where(eq(guardians.organizationId, orgId));

  const guardiansByPlayer = new Map<string, typeof guardianLinks>();
  for (const link of guardianLinks) {
    const existing = guardiansByPlayer.get(link.playerId) ?? [];
    existing.push(link);
    guardiansByPlayer.set(link.playerId, existing);
  }

  const result = orgPlayers.map((player) => ({
    ...player,
    guardians: (guardiansByPlayer.get(player.id) ?? []).map((link) => ({
      ...link.guardian,
      relationship: link.relationship,
      isPrimary: link.isPrimary,
    })),
  }));

  return NextResponse.json(result);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const roleResult = await requireOrgRole(orgId, "admin");
  if ("error" in roleResult) return roleResult.error;

  const body: unknown = await request.json();
  if (!isCreatePlayerBody(body)) {
    return NextResponse.json(
      { error: "firstName and lastName are required" },
      { status: 400 },
    );
  }

  const [player] = await db
    .insert(players)
    .values({
      organizationId: orgId,
      firstName: body.firstName,
      lastName: body.lastName,
      dateOfBirth: body.dateOfBirth ?? null,
    })
    .returning();

  return NextResponse.json(player, { status: 201 });
}

interface CreatePlayerBody {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
}

function isCreatePlayerBody(body: unknown): body is CreatePlayerBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "firstName" in body &&
    typeof (body as Record<string, unknown>).firstName === "string" &&
    "lastName" in body &&
    typeof (body as Record<string, unknown>).lastName === "string"
  );
}
