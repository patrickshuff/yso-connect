import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { seasons } from "@/db/schema";
import { requireOrgRole } from "@/lib/auth";

type RouteParams = { params: Promise<{ orgId: string; seasonId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { orgId, seasonId } = await params;
  const roleResult = await requireOrgRole(orgId, "coach");
  if ("error" in roleResult) return roleResult.error;

  const [season] = await db
    .select()
    .from(seasons)
    .where(and(eq(seasons.id, seasonId), eq(seasons.organizationId, orgId)));

  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  return NextResponse.json(season);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { orgId, seasonId } = await params;
  const roleResult = await requireOrgRole(orgId, "admin");
  if ("error" in roleResult) return roleResult.error;

  const body = (await request.json()) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  for (const field of ["name", "startDate", "endDate", "isActive"] as const) {
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

  const [season] = await db
    .update(seasons)
    .set(updates)
    .where(and(eq(seasons.id, seasonId), eq(seasons.organizationId, orgId)))
    .returning();

  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  return NextResponse.json(season);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { orgId, seasonId } = await params;
  const roleResult = await requireOrgRole(orgId, "owner");
  if ("error" in roleResult) return roleResult.error;

  const [season] = await db
    .delete(seasons)
    .where(and(eq(seasons.id, seasonId), eq(seasons.organizationId, orgId)))
    .returning();

  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
