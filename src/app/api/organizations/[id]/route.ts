import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { getAuthUserId, requireOrgRole } from "@/lib/auth";
import { getMembership } from "@/lib/memberships";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authResult = await getAuthUserId();
  if ("error" in authResult) return authResult.error;

  const membership = await getMembership(id, authResult.userId);
  if (!membership) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id));

  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(org);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const roleResult = await requireOrgRole(id, "admin");
  if ("error" in roleResult) return roleResult.error;

  const body = (await request.json()) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  for (const field of [
    "name",
    "slug",
    "description",
    "logoUrl",
    "websiteUrl",
    "contactEmail",
    "contactPhone",
    "timezone",
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

  const [org] = await db
    .update(organizations)
    .set(updates)
    .where(eq(organizations.id, id))
    .returning();

  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(org);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const roleResult = await requireOrgRole(id, "owner");
  if ("error" in roleResult) return roleResult.error;

  const [org] = await db
    .delete(organizations)
    .where(eq(organizations.id, id))
    .returning();

  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ deleted: true });
}
