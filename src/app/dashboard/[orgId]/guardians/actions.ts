"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guardians, organizations } from "@/db/schema";
import { requireRole } from "@/lib/memberships";
import { sendEmail } from "@/lib/email";
import { buildWelcomeEmail } from "@/lib/email-templates";
import { logger } from "@/lib/logger";

interface CreateGuardianResult {
  success: boolean;
  guardianId?: string;
  error?: string;
}

export async function createGuardian(
  orgId: string,
  formData: FormData
): Promise<CreateGuardianResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  await requireRole(orgId, userId, "admin");

  const firstName = formData.get("firstName") as string | null;
  const lastName = formData.get("lastName") as string | null;
  const email = (formData.get("email") as string | null) || null;
  const phone = (formData.get("phone") as string | null) || null;
  const preferredContact =
    (formData.get("preferredContact") as "sms" | "email" | "both" | null) ??
    "sms";

  if (!firstName || !lastName) {
    return { success: false, error: "First and last name are required" };
  }

  const [guardian] = await db
    .insert(guardians)
    .values({
      organizationId: orgId,
      firstName,
      lastName,
      email,
      phone,
      preferredContact,
    })
    .returning();

  revalidatePath(`/dashboard/${orgId}/guardians`);
  revalidatePath(`/dashboard/${orgId}`);

  // Fire welcome email non-blocking — guardian was already created
  if (guardian.email) {
    const guardianEmail = guardian.email;
    void (async () => {
      try {
        const [org] = await db
          .select({ name: organizations.name })
          .from(organizations)
          .where(eq(organizations.id, orgId));

        const orgName = org?.name ?? "Your Organization";
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.ysoconnect.com";
        const unsubscribeUrl = `${appUrl}/api/unsubscribe?g=${guardian.id}`;

        const htmlBody = buildWelcomeEmail({
          firstName: guardian.firstName,
          orgName,
          appUrl,
          guardianId: guardian.id,
        });
        const unsubscribeHeaders = {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        };

        const result = await sendEmail(
          guardianEmail,
          `Welcome to ${orgName}!`,
          htmlBody,
          unsubscribeHeaders,
        );

        if (!result.success) {
          logger.warn("Guardian welcome email failed", {
            guardianId: guardian.id,
            orgId,
            error: result.error,
          });
        } else {
          logger.info("Guardian welcome email sent", {
            guardianId: guardian.id,
            orgId,
            emailId: result.id,
          });
        }
      } catch (err) {
        logger.error("Unexpected error sending guardian welcome email", {
          guardianId: guardian.id,
          orgId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
  }

  return { success: true, guardianId: guardian.id };
}
