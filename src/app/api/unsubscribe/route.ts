import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guardians, communicationPreferences } from "@/db/schema";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const guardianId = request.nextUrl.searchParams.get("g");

  if (!guardianId) {
    return new NextResponse("Invalid unsubscribe link.", { status: 400 });
  }

  const [guardian] = await db
    .select({ id: guardians.id, organizationId: guardians.organizationId, firstName: guardians.firstName })
    .from(guardians)
    .where(eq(guardians.id, guardianId));

  if (!guardian) {
    return new NextResponse("Invalid unsubscribe link.", { status: 404 });
  }

  // Upsert communication preferences with emailOptIn = false
  await db
    .insert(communicationPreferences)
    .values({
      guardianId: guardian.id,
      organizationId: guardian.organizationId,
      smsOptIn: true,
      emailOptIn: false,
    })
    .onConflictDoUpdate({
      target: [communicationPreferences.guardianId, communicationPreferences.organizationId],
      set: { emailOptIn: false, updatedAt: new Date() },
    });

  logger.info("Guardian unsubscribed from email", { guardianId: guardian.id });

  return new NextResponse(
    `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Unsubscribed</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
      .card { background: white; border-radius: 8px; border: 1px solid #e5e7eb; padding: 40px; max-width: 480px; text-align: center; }
      h1 { font-size: 20px; color: #111827; margin: 0 0 12px; }
      p { font-size: 15px; color: #6b7280; margin: 0; line-height: 1.6; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>You've been unsubscribed</h1>
      <p>Hi ${guardian.firstName}, you'll no longer receive email updates. You can still receive SMS messages if you're opted in.</p>
    </div>
  </body>
</html>`,
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}
