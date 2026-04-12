"use server";

import { eq, and, or } from "drizzle-orm";
import { db } from "@/db";
import { players, guardians, playerGuardians } from "@/db/schema";
import { requireRole, AuthorizationError } from "@/lib/memberships";
import { auth } from "@clerk/nextjs/server";
import { parseCsvRoster, type ParsedGuardian } from "@/lib/csv-import";

export interface ImportResult {
  importedCount: number;
  skippedCount: number;
  errors: Array<{ row: number; message: string }>;
}

/**
 * Find an existing guardian within the org by email or phone,
 * or create a new one. Returns the guardian ID.
 */
async function findOrCreateGuardian(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  orgId: string,
  g: ParsedGuardian,
): Promise<string> {
  // Build conditions for dedup: match by email or phone within org
  const conditions = [];
  if (g.email) {
    conditions.push(eq(guardians.email, g.email));
  }
  if (g.phone) {
    conditions.push(eq(guardians.phone, g.phone));
  }

  if (conditions.length > 0) {
    const [existing] = await tx
      .select({ id: guardians.id })
      .from(guardians)
      .where(
        and(
          eq(guardians.organizationId, orgId),
          or(...conditions),
        ),
      )
      .limit(1);

    if (existing) {
      return existing.id;
    }
  }

  const [created] = await tx
    .insert(guardians)
    .values({
      organizationId: orgId,
      firstName: g.firstName,
      lastName: g.lastName,
      email: g.email,
      phone: g.phone,
    })
    .returning({ id: guardians.id });

  return created.id;
}

export async function importCsvRoster(
  orgId: string,
  csvText: string,
): Promise<ImportResult> {
  // Auth check
  const { userId } = await auth({ treatPendingAsSignedOut: false });
  if (!userId) {
    return { importedCount: 0, skippedCount: 0, errors: [{ row: 0, message: "Unauthorized" }] };
  }

  try {
    await requireRole(orgId, userId, "admin");
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return { importedCount: 0, skippedCount: 0, errors: [{ row: 0, message: e.message }] };
    }
    throw e;
  }

  // Parse CSV
  const { rows, errors } = parseCsvRoster(csvText);
  const resultErrors = [...errors];
  let importedCount = 0;

  // Import each valid row in a transaction
  for (const row of rows) {
    try {
      await db.transaction(async (tx) => {
        // Create player
        const [player] = await tx
          .insert(players)
          .values({
            organizationId: orgId,
            firstName: row.playerFirstName,
            lastName: row.playerLastName,
            dateOfBirth: row.playerDob,
          })
          .returning({ id: players.id });

        // Link guardians
        for (let gi = 0; gi < row.guardians.length; gi++) {
          const g = row.guardians[gi];
          const guardianId = await findOrCreateGuardian(tx, orgId, g);

          await tx.insert(playerGuardians).values({
            playerId: player.id,
            guardianId,
            relationship: g.relationship,
            isPrimary: gi === 0,
          });
        }
      });
      importedCount++;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown database error";
      resultErrors.push({ row: 0, message: `Failed to import ${row.playerFirstName} ${row.playerLastName}: ${message}` });
    }
  }

  return {
    importedCount,
    skippedCount: errors.length,
    errors: resultErrors,
  };
}
