"use server";

import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { interestSubmissions } from "@/db/schema";
import { requireRole } from "@/lib/memberships";

type SubmissionStatus = "new" | "contacted" | "enrolled" | "declined";

export async function updateSubmissionStatus(
  submissionId: string,
  status: SubmissionStatus,
  orgId: string,
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await requireRole(orgId, userId, "admin");

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
