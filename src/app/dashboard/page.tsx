import Link from "next/link";
import { Trophy } from "lucide-react";
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950">
      <div className="w-full max-w-2xl">
        {/* Logo mark */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary">
            <Trophy className="size-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome to YSO Connect
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            How would you like to get started?
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-2 transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>I&apos;m a Coach</CardTitle>
              <CardDescription>
                Set up your team in under a minute. Add players and guardians right away.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/quick-setup" className={cn(buttonVariants(), "w-full")}>
                Set Up My Team
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>I&apos;m Setting Up an Organization</CardTitle>
              <CardDescription>
                Create a full organization with multiple seasons, sports, and divisions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/onboarding" className={cn(buttonVariants(), "w-full")}>
                Create Organization
              </Link>
            </CardContent>
          </Card>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          30-day free trial · No credit card required · Cancel anytime
        </p>
      </div>
    </div>
  );
}
