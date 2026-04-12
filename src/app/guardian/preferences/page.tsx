import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { guardians, communicationPreferences } from "@/db/schema";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updatePreferences } from "./actions";

interface PreferencesSearchParams {
  g?: string;
  t?: string;
  saved?: string;
}

async function loadPreferences(guardianId: string) {
  const [guardian] = await db
    .select({
      id: guardians.id,
      firstName: guardians.firstName,
      email: guardians.email,
      phone: guardians.phone,
      organizationId: guardians.organizationId,
    })
    .from(guardians)
    .where(eq(guardians.id, guardianId));

  if (!guardian) return null;

  const [prefs] = await db
    .select()
    .from(communicationPreferences)
    .where(
      and(
        eq(communicationPreferences.guardianId, guardian.id),
        eq(communicationPreferences.organizationId, guardian.organizationId),
      ),
    );

  return {
    guardian,
    emailOptIn: prefs?.emailOptIn ?? true,
    smsOptIn: prefs?.smsOptIn ?? true,
  };
}

export default async function GuardianPreferencesPage({
  searchParams,
}: {
  searchParams: Promise<PreferencesSearchParams>;
}) {
  const { g: guardianId, t: token, saved } = await searchParams;

  if (!guardianId || !token || !verifyUnsubscribeToken(guardianId, token)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Link invalid</CardTitle>
            <CardDescription>
              We couldn&apos;t verify this preferences link. It may have been
              tampered with or expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button>Back to home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = await loadPreferences(guardianId);
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Not found</CardTitle>
            <CardDescription>
              We couldn&apos;t find this contact in our system.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Communication preferences</CardTitle>
          <CardDescription>
            Hi {data.guardian.firstName}, control how your team reaches you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updatePreferences} className="space-y-5">
            <input type="hidden" name="g" value={guardianId} />
            <input type="hidden" name="t" value={token} />

            <label className="flex items-start gap-3 rounded-lg border border-input p-4 cursor-pointer hover:bg-muted/40">
              <input
                type="checkbox"
                name="emailOptIn"
                defaultChecked={data.emailOptIn}
                disabled={!data.guardian.email}
                className="mt-0.5 size-4"
              />
              <div className="flex-1">
                <div className="text-sm font-medium">Email updates</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {data.guardian.email ?? "No email on file"}
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-input p-4 cursor-pointer hover:bg-muted/40">
              <input
                type="checkbox"
                name="smsOptIn"
                defaultChecked={data.smsOptIn}
                disabled={!data.guardian.phone}
                className="mt-0.5 size-4"
              />
              <div className="flex-1">
                <div className="text-sm font-medium">Text messages</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {data.guardian.phone ?? "No phone on file"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  You can also reply STOP to any text to unsubscribe from SMS.
                </div>
              </div>
            </label>

            {saved && (
              <p className="text-sm text-emerald-600">
                Preferences saved.
              </p>
            )}

            <Button type="submit" className="w-full">
              Save preferences
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
