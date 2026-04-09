import Link from "next/link";
import { getCurrentUserOrganizations } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const orgs = await getCurrentUserOrganizations();

  if (orgs.length > 0) {
    redirect(`/dashboard/${orgs[0].id}`);
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
