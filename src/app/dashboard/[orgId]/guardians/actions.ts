"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guardians, organizations } from "@/db/schema";
import { requireRole } from "@/lib/memberships";
import { sendEmail } from "@/lib/email";
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
        const contactMethod =
          guardian.preferredContact === "sms"
            ? "SMS text messages"
            : guardian.preferredContact === "email"
              ? "email"
              : "SMS and email";

        const htmlBody = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;">
      <tr>
        <td style="padding: 40px 40px 24px;">
          <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">
            Welcome to ${orgName}!
          </h1>
          <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.6;">
            Hi ${guardian.firstName},
          </p>
          <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.6;">
            You've been added to <strong>${orgName}</strong> as a guardian. You'll receive updates about your player's schedule and important announcements via <strong>${contactMethod}</strong>.
          </p>
          <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.6;">
            If you ever want to stop receiving SMS messages, simply reply <strong>STOP</strong> to any text message from us.
          </p>
          <p style="margin: 0; font-size: 16px; color: #374151; line-height: 1.6;">
            If you have any questions, please reach out to your organization's coach or administrator.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 24px 40px 40px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            This message was sent because you were added to ${orgName}. To opt out of SMS, reply STOP.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
        `.trim();

        const result = await sendEmail(
          guardianEmail,
          `Welcome to ${orgName}!`,
          htmlBody,
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
