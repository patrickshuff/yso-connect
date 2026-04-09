"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Lock } from "lucide-react";

interface BillingGateProps {
  children: React.ReactNode;
  subscriptionStatus: "trial" | "active" | "expired" | "none";
  trialEndsAt: string | null;
  subscriptionPaidUntil: string | null;
  orgId: string;
}

function getTrialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const now = new Date();
  const end = new Date(trialEndsAt);
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 0);
}

function isTrialActive(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return false;
  return new Date() < new Date(trialEndsAt);
}

function isSubActive(
  status: string,
  paidUntil: string | null,
): boolean {
  return (
    status === "active" &&
    paidUntil !== null &&
    new Date() < new Date(paidUntil)
  );
}

export function BillingGate({
  children,
  subscriptionStatus,
  trialEndsAt,
  subscriptionPaidUntil,
  orgId,
}: BillingGateProps) {
  if (isSubActive(subscriptionStatus, subscriptionPaidUntil)) {
    return <>{children}</>;
  }

  if (isTrialActive(trialEndsAt)) {
    const daysRemaining = getTrialDaysRemaining(trialEndsAt);
    return (
      <>
        <TrialBanner daysRemaining={daysRemaining} orgId={orgId} />
        {children}
      </>
    );
  }

  return <ExpiredGate orgId={orgId} />;
}

function TrialBanner({
  daysRemaining,
  orgId,
}: {
  daysRemaining: number;
  orgId: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950">
      <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
        <Clock className="size-4" />
        <span>
          {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left in your
          free trial
        </span>
      </div>
      <a href={`/dashboard/${orgId}/billing`}>
        <Button variant="outline" size="sm" className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900">
          Upgrade now
        </Button>
      </a>
    </div>
  );
}

function ExpiredGate({ orgId }: { orgId: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="mx-auto max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <Lock className="size-8 text-zinc-500" />
          </div>
          <CardTitle className="text-xl">
            Your 30-day trial has ended
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your data is safe and preserved. Upgrade to continue managing your
            teams, players, and schedules.
          </p>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-2xl font-bold">$49</p>
            <p className="text-sm text-muted-foreground">per month — cancel anytime</p>
          </div>
          <a href={`/dashboard/${orgId}/billing`}>
            <Button className="mt-2 w-full">Subscribe now</Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
