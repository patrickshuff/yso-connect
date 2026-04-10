import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { getCurrentUserOrganizations } from "@/lib/auth";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guardians } from "@/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GUARDIAN_INVITE_COOKIE = "guardian_invite_token";

export default async function DashboardPage() {
  const orgs = await getCurrentUserOrganizations();

  if (orgs.length > 0) {
    redirect(`/dashboard/${orgs[0].id}`);
  }

  // Check for a pending guardian invite claim (cookie set by /invite/[token])
  const cookieStore = await cookies();
  const inviteToken = cookieStore.get(GUARDIAN_INVITE_COOKIE)?.value;
  if (inviteToken) {
    redirect("/api/claim-guardian");
  }

  // Check if this user is already a linked guardian (returning visit after claim)
  const { userId } = await auth();
  if (userId) {
    const [existingGuardian] = await db
      .select({ id: guardians.id })
      .from(guardians)
      .where(eq(guardians.clerkUserId, userId))
      .limit(1);

    if (existingGuardian) {
      redirect("/dashboard/guardian");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Welcome to YSO Connect
      </h2>
      <p className="mb-8 text-zinc-600 dark:text-zinc-400">
        How would you like to get started?
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>I&apos;m a Coach</CardTitle>
            <CardDescription>
              Set up your team in under a minute. Add players and guardians
              right away.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/quick-setup"
              className={cn(buttonVariants(), "w-full")}
            >
              Set Up My Team
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>I&apos;m Setting Up an Organization</CardTitle>
            <CardDescription>
              Create a full organization with multiple seasons, sports, and
              divisions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/onboarding"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full",
              )}
            >
              Create Organization
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
