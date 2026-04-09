"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { organizations, smsConsents } from "@/db/schema";

interface SubmitConsentState {
  success: boolean;
  error: string | null;
}

const PHONE_REGEX = /^\+?1?\d{10,15}$/;

function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, "");
}

export async function submitSmsConsent(
  _prevState: SubmitConsentState,
  formData: FormData,
): Promise<SubmitConsentState> {
  const slug = formData.get("slug") as string | null;
  const phoneRaw = formData.get("phoneNumber") as string | null;
  const consentChecked = formData.get("consentChecked") as string | null;
  const consentText = formData.get("consentText") as string | null;
  const guardianName = formData.get("guardianName") as string | null;

  if (!slug || !phoneRaw || !consentText) {
    return { success: false, error: "Phone number is required." };
  }

  if (consentChecked !== "on") {
    return {
      success: false,
      error: "You must agree to receive text messages.",
    };
  }

  const phone = normalizePhone(phoneRaw);
  if (!PHONE_REGEX.test(phone)) {
    return {
      success: false,
      error:
        "Please enter a valid phone number (10-15 digits, US or international).",
    };
  }

  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  if (!org) {
    return { success: false, error: "Organization not found." };
  }

  const headerStore = await headers();
  const ipAddress =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerStore.get("user-agent") ?? null;

  await db.insert(smsConsents).values({
    organizationId: org.id,
    phoneNumber: phone,
    consentGiven: true,
    consentMethod: "web_form",
    consentText,
    ipAddress,
    userAgent,
    guardianName: guardianName || null,
    consentedAt: new Date(),
  });

  return { success: true, error: null };
}
