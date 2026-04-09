"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations, interestSubmissions } from "@/db/schema";

interface SubmitInterestFormState {
  success: boolean;
  error: string | null;
}

export async function submitInterestForm(
  _prevState: SubmitInterestFormState,
  formData: FormData,
): Promise<SubmitInterestFormState> {
  const slug = formData.get("slug") as string | null;
  const parentName = formData.get("parentName") as string | null;
  const parentEmail = formData.get("parentEmail") as string | null;
  const parentPhone = formData.get("parentPhone") as string | null;
  const childName = formData.get("childName") as string | null;
  const childAgeRaw = formData.get("childAge") as string | null;
  const sportInterest = formData.get("sportInterest") as string | null;
  const message = formData.get("message") as string | null;

  if (!slug || !parentName || !parentEmail) {
    return { success: false, error: "Name and email are required." };
  }

  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  if (!org) {
    return { success: false, error: "Organization not found." };
  }

  const childAge = childAgeRaw ? parseInt(childAgeRaw, 10) : null;

  await db.insert(interestSubmissions).values({
    organizationId: org.id,
    parentName,
    parentEmail,
    parentPhone: parentPhone || null,
    childName: childName || null,
    childAge: childAge && !isNaN(childAge) ? childAge : null,
    sportInterest: sportInterest || null,
    message: message || null,
  });

  return { success: true, error: null };
}
