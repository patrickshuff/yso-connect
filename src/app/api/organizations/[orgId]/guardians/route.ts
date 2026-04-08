import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guardians, playerGuardians, players } from "@/db/schema";
import { requireOrgRole } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const roleResult = await requireOrgRole(orgId, "coach");
  if ("error" in roleResult) return roleResult.error;

  const orgGuardians = await db
    .select()
    .from(guardians)
    .where(eq(guardians.organizationId, orgId));

  if (orgGuardians.length === 0) {
    return NextResponse.json([]);
  }

  const playerLinks = await db
    .select({
      guardianId: playerGuardians.guardianId,
      playerId: playerGuardians.playerId,
      relationship: playerGuardians.relationship,
      isPrimary: playerGuardians.isPrimary,
      player: players,
    })
    .from(playerGuardians)
    .innerJoin(players, eq(playerGuardians.playerId, players.id))
    .where(eq(players.organizationId, orgId));

  const playersByGuardian = new Map<string, typeof playerLinks>();
  for (const link of playerLinks) {
    const existing = playersByGuardian.get(link.guardianId) ?? [];
    existing.push(link);
    playersByGuardian.set(link.guardianId, existing);
  }

  const result = orgGuardians.map((guardian) => ({
    ...guardian,
    players: (playersByGuardian.get(guardian.id) ?? []).map((link) => ({
      ...link.player,
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
  if (!isCreateGuardianBody(body)) {
    return NextResponse.json(
      { error: "firstName and lastName are required" },
      { status: 400 },
    );
  }

  const [guardian] = await db
    .insert(guardians)
    .values({
      organizationId: orgId,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email ?? null,
      phone: body.phone ?? null,
      preferredContact: body.preferredContact ?? "sms",
      clerkUserId: body.clerkUserId ?? null,
    })
    .returning();

  return NextResponse.json(guardian, { status: 201 });
}

interface CreateGuardianBody {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  preferredContact?: "sms" | "email" | "both";
  clerkUserId?: string;
}

function isCreateGuardianBody(body: unknown): body is CreateGuardianBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "firstName" in body &&
    typeof (body as Record<string, unknown>).firstName === "string" &&
    "lastName" in body &&
    typeof (body as Record<string, unknown>).lastName === "string"
  );
}
