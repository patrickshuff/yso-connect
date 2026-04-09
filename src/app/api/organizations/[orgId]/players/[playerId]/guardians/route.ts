import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { players, guardians, playerGuardians } from "@/db/schema";
import { requireOrgRole } from "@/lib/auth";

type RouteParams = {
  params: Promise<{ orgId: string; playerId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { orgId, playerId } = await params;
  const roleResult = await requireOrgRole(orgId, "admin");
  if ("error" in roleResult) return roleResult.error;

  const body: unknown = await request.json();
  if (!isLinkGuardianBody(body)) {
    return NextResponse.json(
      { error: "guardianId and relationshipType are required" },
      { status: 400 },
    );
  }

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
      and(
        eq(guardians.id, body.guardianId),
        eq(guardians.organizationId, orgId),
      ),
    );

  if (!guardian) {
    return NextResponse.json({ error: "Guardian not found" }, { status: 404 });
  }

  const [record] = await db
    .insert(playerGuardians)
    .values({
      playerId,
      guardianId: body.guardianId,
      relationship: body.relationshipType,
    })
    .returning();

  return NextResponse.json(record, { status: 201 });
}

interface LinkGuardianBody {
  guardianId: string;
  relationshipType:
    | "mother"
    | "father"
    | "guardian"
    | "grandparent"
    | "other";
}

function isLinkGuardianBody(body: unknown): body is LinkGuardianBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "guardianId" in body &&
    typeof (body as Record<string, unknown>).guardianId === "string" &&
    "relationshipType" in body &&
    typeof (body as Record<string, unknown>).relationshipType === "string"
  );
}
