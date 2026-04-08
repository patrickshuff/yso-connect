import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { requireOrgRole } from "@/lib/auth";

type RouteParams = { params: Promise<{ orgId: string; teamId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { orgId, teamId } = await params;
  const roleResult = await requireOrgRole(orgId, "coach");
  if ("error" in roleResult) return roleResult.error;

  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.organizationId, orgId)));

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json(team);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { orgId, teamId } = await params;
  const roleResult = await requireOrgRole(orgId, "admin");
  if ("error" in roleResult) return roleResult.error;

  const body = (await request.json()) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  for (const field of ["name", "seasonId", "divisionId"] as const) {
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

  const [team] = await db
    .update(teams)
    .set(updates)
    .where(and(eq(teams.id, teamId), eq(teams.organizationId, orgId)))
    .returning();

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json(team);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { orgId, teamId } = await params;
  const roleResult = await requireOrgRole(orgId, "admin");
  if ("error" in roleResult) return roleResult.error;

  const [team] = await db
    .delete(teams)
    .where(and(eq(teams.id, teamId), eq(teams.organizationId, orgId)))
    .returning();

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
