"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { guardians } from "@/db/schema";
import { requireRole } from "@/lib/memberships";

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

  return { success: true, guardianId: guardian.id };
}
