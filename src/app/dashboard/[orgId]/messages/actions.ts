"use server";

import { auth } from "@clerk/nextjs/server";
import { eq, desc, count, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { messages, messageDeliveries, teams } from "@/db/schema";
import { requireRole } from "@/lib/memberships";
import { sendMessage } from "@/lib/messaging";

interface SendMessageResult {
  success: boolean;
  messageId?: string;
  recipientCount?: number;
  deliveryCount?: number;
  error?: string;
}

export async function sendMessageAction(
  orgId: string,
  formData: FormData,
): Promise<SendMessageResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  await requireRole(orgId, userId, "coach");

  const targetType = formData.get("targetType") as string | null;
  const targetId = (formData.get("targetId") as string | null) || null;
  const channel = formData.get("channel") as string | null;
  const subject = (formData.get("subject") as string | null) || null;
  const body = formData.get("body") as string | null;

  if (!targetType || !channel || !body) {
    return { success: false, error: "Target, channel, and message body are required" };
  }

  if (targetType !== "team" && targetType !== "organization") {
    return { success: false, error: "Invalid target type" };
  }

  if (channel !== "sms" && channel !== "email" && channel !== "both") {
    return { success: false, error: "Invalid channel" };
  }

  if (targetType === "team" && !targetId) {
    return { success: false, error: "Team selection is required when targeting a team" };
  }

  const result = await sendMessage({
    orgId,
    senderId: userId,
    targetType,
    targetId,
    subject,
    body,
    channel,
  });

  revalidatePath(`/dashboard/${orgId}/messages`);

  return {
    success: true,
    messageId: result.messageId,
    recipientCount: result.recipientCount,
    deliveryCount: result.deliveryCount,
  };
}

interface MessageRow {
  id: string;
  subject: string | null;
  body: string;
  targetType: string;
  targetId: string | null;
  channel: string;
  sentAt: Date | null;
  createdAt: Date;
  teamName: string | null;
  totalDeliveries: number;
  sentDeliveries: number;
  failedDeliveries: number;
}

export async function getMessages(orgId: string): Promise<MessageRow[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await requireRole(orgId, userId, "guardian");

  const rows = await db
    .select({
      id: messages.id,
      subject: messages.subject,
      body: messages.body,
      targetType: messages.targetType,
      targetId: messages.targetId,
      channel: messages.channel,
      sentAt: messages.sentAt,
      createdAt: messages.createdAt,
      teamName: teams.name,
      totalDeliveries: count(messageDeliveries.id),
      sentDeliveries: sql<number>`count(case when ${messageDeliveries.status} = 'sent' or ${messageDeliveries.status} = 'delivered' then 1 end)`,
      failedDeliveries: sql<number>`count(case when ${messageDeliveries.status} = 'failed' then 1 end)`,
    })
    .from(messages)
    .leftJoin(teams, eq(messages.targetId, teams.id))
    .leftJoin(messageDeliveries, eq(messages.id, messageDeliveries.messageId))
    .where(eq(messages.organizationId, orgId))
    .groupBy(messages.id, teams.name)
    .orderBy(desc(messages.createdAt));

  return rows;
}
