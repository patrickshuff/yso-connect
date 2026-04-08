import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { requireOrgRole } from "@/lib/auth";

type RouteParams = { params: Promise<{ orgId: string; eventId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { orgId, eventId } = await params;
  const roleResult = await requireOrgRole(orgId, "guardian");
  if ("error" in roleResult) return roleResult.error;

  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.organizationId, orgId)));

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json(event);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { orgId, eventId } = await params;
  const roleResult = await requireOrgRole(orgId, "coach");
  if ("error" in roleResult) return roleResult.error;

  const body = (await request.json()) as Record<string, unknown>;
  const allowedFields = [
    "title",
    "description",
    "eventType",
    "location",
    "startTime",
    "endTime",
    "isAllDay",
    "isCancelled",
    "teamId",
  ] as const;

  const updates: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in body) {
      if (field === "startTime" || field === "endTime") {
        updates[field] = new Date(body[field] as string);
      } else {
        updates[field] = body[field];
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  updates.updatedAt = new Date();

  const [event] = await db
    .update(events)
    .set(updates)
    .where(and(eq(events.id, eventId), eq(events.organizationId, orgId)))
    .returning();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json(event);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { orgId, eventId } = await params;
  const roleResult = await requireOrgRole(orgId, "coach");
  if ("error" in roleResult) return roleResult.error;

  const [event] = await db
    .delete(events)
    .where(and(eq(events.id, eventId), eq(events.organizationId, orgId)))
    .returning();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
