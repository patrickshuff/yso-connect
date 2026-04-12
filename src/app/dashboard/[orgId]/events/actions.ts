"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { requireRole } from "@/lib/memberships";
import { createDefaultReminders } from "@/lib/reminders";

type EventType = "game" | "practice" | "event" | "meeting";

interface ActionResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

export async function createEvent(
  orgId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { userId } = await auth({ treatPendingAsSignedOut: false });
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  await requireRole(orgId, userId, "coach");

  const title = formData.get("title") as string | null;
  const eventType = formData.get("eventType") as EventType | null;
  const startTime = formData.get("startTime") as string | null;
  const endTime = formData.get("endTime") as string | null;
  const teamId = (formData.get("teamId") as string | null) || null;
  const location = (formData.get("location") as string | null) || null;
  const description = (formData.get("description") as string | null) || null;

  if (!title || !eventType || !startTime || !endTime) {
    return {
      success: false,
      error: "Title, event type, start time, and end time are required",
    };
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (end <= start) {
    return { success: false, error: "End time must be after start time" };
  }

  const [event] = await db
    .insert(events)
    .values({
      organizationId: orgId,
      teamId,
      title,
      description,
      eventType,
      location,
      startTime: start,
      endTime: end,
    })
    .returning();

  await createDefaultReminders(event.id, start, orgId);

  if (teamId) {
    revalidatePath(`/dashboard/${orgId}/teams/${teamId}/events`);
    revalidatePath(`/dashboard/${orgId}/teams/${teamId}`);
  }
  revalidatePath(`/dashboard/${orgId}`);

  return { success: true, eventId: event.id };
}

export async function cancelEvent(
  orgId: string,
  eventId: string,
): Promise<ActionResult> {
  const { userId } = await auth({ treatPendingAsSignedOut: false });
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  await requireRole(orgId, userId, "coach");

  const [event] = await db
    .update(events)
    .set({ isCancelled: true, updatedAt: new Date() })
    .where(and(eq(events.id, eventId), eq(events.organizationId, orgId)))
    .returning();

  if (!event) {
    return { success: false, error: "Event not found" };
  }

  if (event.teamId) {
    revalidatePath(`/dashboard/${orgId}/teams/${event.teamId}/events`);
    revalidatePath(`/dashboard/${orgId}/teams/${event.teamId}`);
  }
  revalidatePath(`/dashboard/${orgId}`);

  return { success: true, eventId: event.id };
}
