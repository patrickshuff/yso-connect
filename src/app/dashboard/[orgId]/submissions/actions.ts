"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { interestSubmissions } from "@/db/schema";

type SubmissionStatus = "new" | "contacted" | "enrolled" | "declined";

export async function updateSubmissionStatus(
  submissionId: string,
  status: SubmissionStatus,
  orgId: string,
) {
  await db
    .update(interestSubmissions)
    .set({ status })
    .where(
      and(
        eq(interestSubmissions.id, submissionId),
        eq(interestSubmissions.organizationId, orgId),
      ),
    );

  revalidatePath(`/dashboard/${orgId}/submissions`);
}
