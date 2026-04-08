import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { seasons } from "@/db/schema";
import { requireOrgRole } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const roleResult = await requireOrgRole(orgId, "coach");
  if ("error" in roleResult) return roleResult.error;

  const orgSeasons = await db
    .select()
    .from(seasons)
    .where(eq(seasons.organizationId, orgId));

  return NextResponse.json(orgSeasons);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const roleResult = await requireOrgRole(orgId, "admin");
  if ("error" in roleResult) return roleResult.error;

  const body: unknown = await request.json();
  if (!isCreateSeasonBody(body)) {
    return NextResponse.json(
      { error: "name, startDate, and endDate are required" },
      { status: 400 },
    );
  }

  const [season] = await db
    .insert(seasons)
    .values({
      organizationId: orgId,
      name: body.name,
      startDate: body.startDate,
      endDate: body.endDate,
      isActive: body.isActive ?? false,
    })
    .returning();

  return NextResponse.json(season, { status: 201 });
}

interface CreateSeasonBody {
  name: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

function isCreateSeasonBody(body: unknown): body is CreateSeasonBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    typeof (body as Record<string, unknown>).name === "string" &&
    "startDate" in body &&
    typeof (body as Record<string, unknown>).startDate === "string" &&
    "endDate" in body &&
    typeof (body as Record<string, unknown>).endDate === "string"
  );
}
