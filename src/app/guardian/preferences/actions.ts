"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { guardians, communicationPreferences } from "@/db/schema";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";
import { logger } from "@/lib/logger";

export async function updatePreferences(formData: FormData) {
  const guardianId = formData.get("g") as string | null;
  const token = formData.get("t") as string | null;

  if (!guardianId || !token || !verifyUnsubscribeToken(guardianId, token)) {
    redirect(`/guardian/preferences?g=${guardianId ?? ""}&t=${token ?? ""}`);
  }

  const [guardian] = await db
    .select({
      id: guardians.id,
      organizationId: guardians.organizationId,
    })
    .from(guardians)
    .where(eq(guardians.id, guardianId));

  if (!guardian) {
    redirect(`/guardian/preferences?g=${guardianId}&t=${token}`);
  }

  const emailOptIn = formData.get("emailOptIn") === "on";
  const smsOptIn = formData.get("smsOptIn") === "on";

  await db
    .insert(communicationPreferences)
    .values({
      guardianId: guardian.id,
      organizationId: guardian.organizationId,
      emailOptIn,
      smsOptIn,
    })
    .onConflictDoUpdate({
      target: [
        communicationPreferences.guardianId,
        communicationPreferences.organizationId,
      ],
      set: { emailOptIn, smsOptIn, updatedAt: new Date() },
    });

  logger.info("Guardian updated preferences", {
    guardianId: guardian.id,
    emailOptIn,
    smsOptIn,
  });

  redirect(`/guardian/preferences?g=${guardianId}&t=${token}&saved=1`);
}
