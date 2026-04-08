import { NextRequest, NextResponse } from "next/server";
import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { requireOrgRole } from "@/lib/auth";

type RouteParams = { params: Promise<{ orgId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { orgId } = await params;
  const roleResult = await requireOrgRole(orgId, "guardian");
  if ("error" in roleResult) return roleResult.error;

  const searchParams = request.nextUrl.searchParams;
  const teamId = searchParams.get("teamId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const conditions = [eq(events.organizationId, orgId)];

  if (teamId) {
    conditions.push(eq(events.teamId, teamId));
  }
  if (startDate) {
    conditions.push(gte(events.startTime, new Date(startDate)));
  }
  if (endDate) {
    conditions.push(lte(events.startTime, new Date(endDate)));
  }

  const orgEvents = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(events.startTime);

  return NextResponse.json(orgEvents);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { orgId } = await params;
  const roleResult = await requireOrgRole(orgId, "coach");
  if ("error" in roleResult) return roleResult.error;

  const body: unknown = await request.json();
  if (!isCreateEventBody(body)) {
    return NextResponse.json(
      { error: "title, eventType, startTime, and endTime are required" },
      { status: 400 },
    );
  }

  const [event] = await db
    .insert(events)
    .values({
      organizationId: orgId,
      teamId: body.teamId ?? null,
      title: body.title,
      description: body.description ?? null,
      eventType: body.eventType,
      location: body.location ?? null,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      isAllDay: body.isAllDay ?? false,
    })
    .returning();

  return NextResponse.json(event, { status: 201 });
}

type EventType = "game" | "practice" | "event" | "meeting";

interface CreateEventBody {
  title: string;
  eventType: EventType;
  startTime: string;
  endTime: string;
  teamId?: string;
  description?: string;
  location?: string;
  isAllDay?: boolean;
}

const VALID_EVENT_TYPES: EventType[] = ["game", "practice", "event", "meeting"];

function isCreateEventBody(body: unknown): body is CreateEventBody {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.title === "string" &&
    typeof b.eventType === "string" &&
    VALID_EVENT_TYPES.includes(b.eventType as EventType) &&
    typeof b.startTime === "string" &&
    typeof b.endTime === "string"
  );
}
