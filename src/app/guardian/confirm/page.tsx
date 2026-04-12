import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guardians, organizations } from "@/db/schema";
import { verifyConfirmationToken } from "@/lib/confirmation-token";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ g?: string; t?: string }>;
}

async function confirmGuardian(
  guardianId: string,
  token: string,
): Promise<{ ok: boolean; orgName?: string; alreadyConfirmed?: boolean }> {
  if (!verifyConfirmationToken(guardianId, token)) {
    return { ok: false };
  }

  const [guardian] = await db
    .select({
      id: guardians.id,
      confirmedAt: guardians.confirmedAt,
      orgName: organizations.name,
    })
    .from(guardians)
    .leftJoin(organizations, eq(organizations.id, guardians.organizationId))
    .where(eq(guardians.id, guardianId))
    .limit(1);

  if (!guardian) {
    return { ok: false };
  }

  const orgName = guardian.orgName ?? "Your Organization";

  if (guardian.confirmedAt) {
    return { ok: true, orgName, alreadyConfirmed: true };
  }

  await db
    .update(guardians)
    .set({ confirmedAt: new Date() })
    .where(eq(guardians.id, guardianId));

  logger.info("Guardian email confirmed", { guardianId });

  return { ok: true, orgName, alreadyConfirmed: false };
}

export default async function GuardianConfirmPage({ searchParams }: PageProps) {
  const { g, t } = await searchParams;

  if (!g || !t) {
    return (
      <ConfirmShell>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid confirmation link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              This confirmation link is missing required information. Please
              use the link from your email.
            </p>
            <Link href="/">
              <Button>Back to home</Button>
            </Link>
          </CardContent>
        </Card>
      </ConfirmShell>
    );
  }

  const result = await confirmGuardian(g, t);

  if (!result.ok) {
    return (
      <ConfirmShell>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Confirmation link invalid</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              We couldn&apos;t verify this confirmation link. It may have been
              tampered with or the guardian no longer exists.
            </p>
            <Link href="/">
              <Button>Back to home</Button>
            </Link>
          </CardContent>
        </Card>
      </ConfirmShell>
    );
  }

  return (
    <ConfirmShell>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {result.alreadyConfirmed
              ? "You're all set"
              : "Email updates confirmed"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            {result.alreadyConfirmed
              ? `You've already confirmed email updates from ${result.orgName}.`
              : `Thanks! You'll now receive schedule updates, reminders, and team messages from ${result.orgName}.`}
          </p>
          <Link href="/">
            <Button>Back to home</Button>
          </Link>
        </CardContent>
      </Card>
    </ConfirmShell>
  );
}

function ConfirmShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      {children}
    </main>
  );
}
