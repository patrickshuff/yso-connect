"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, CreditCard, XCircle } from "lucide-react";
import { createCoachCheckoutSession } from "@/app/dashboard/[orgId]/billing/actions";

interface BillingPageContentProps {
  orgId: string;
  subscriptionStatus: "trial" | "active" | "expired" | "none";
  trialEndsAt: string | null;
  subscriptionPaidUntil: string | null;
  createdAt: string;
}

function getTrialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const diff = Math.ceil(
    (new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(diff, 0);
}

function StatusBadge({
  status,
  trialEndsAt,
  subscriptionPaidUntil,
}: {
  status: string;
  trialEndsAt: string | null;
  subscriptionPaidUntil: string | null;
}) {
  if (
    status === "active" &&
    subscriptionPaidUntil &&
    new Date() < new Date(subscriptionPaidUntil)
  ) {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <CheckCircle2 className="mr-1 size-3" />
        Active
      </Badge>
    );
  }

  if (status === "trial" && trialEndsAt && new Date() < new Date(trialEndsAt)) {
    return (
      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
        <Clock className="mr-1 size-3" />
        Trial
      </Badge>
    );
  }

  return (
    <Badge variant="destructive">
      <XCircle className="mr-1 size-3" />
      Expired
    </Badge>
  );
}

export function BillingPageContent({
  orgId,
  subscriptionStatus,
  trialEndsAt,
  subscriptionPaidUntil,
  createdAt,
}: BillingPageContentProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const daysRemaining = getTrialDaysRemaining(trialEndsAt);
  const isTrialRunning =
    subscriptionStatus === "trial" &&
    trialEndsAt !== null &&
    new Date() < new Date(trialEndsAt);
  const isSubActive =
    subscriptionStatus === "active" &&
    subscriptionPaidUntil !== null &&
    new Date() < new Date(subscriptionPaidUntil);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);

    const result = await createCoachCheckoutSession(orgId);
    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      setError(result.error ?? "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Billing</h2>
        <p className="text-muted-foreground">
          Manage your subscription and billing details.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Current Plan
              <StatusBadge
                status={subscriptionStatus}
                trialEndsAt={trialEndsAt}
                subscriptionPaidUntil={subscriptionPaidUntil}
              />
            </CardTitle>
            <CardDescription>
              Organization created on{" "}
              {new Date(createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isTrialRunning && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {daysRemaining} {daysRemaining === 1 ? "day" : "days"}{" "}
                  remaining in your free trial
                </p>
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Trial ends on{" "}
                  {new Date(trialEndsAt!).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}

            {isSubActive && subscriptionPaidUntil && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Subscription active
                </p>
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                  Paid through{" "}
                  {new Date(subscriptionPaidUntil).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}

            {!isTrialRunning && !isSubActive && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Your access has expired
                </p>
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  Upgrade to regain access to your dashboard. Your data is
                  preserved.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upgrade Card */}
        {!isSubActive && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-5" />
                Coach Plan
              </CardTitle>
              <CardDescription>
                Full access to your dashboard, teams, and messaging.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold">$5</p>
                <p className="text-sm text-muted-foreground">per month</p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-green-600" />
                  Manage teams and players
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-green-600" />
                  Schedule games and events
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-green-600" />
                  Send messages to guardians
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-green-600" />
                  Collect payments and forms
                </li>
              </ul>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <Button
                className="w-full"
                onClick={handleUpgrade}
                disabled={loading}
              >
                {loading ? "Redirecting..." : "Subscribe for $5/mo"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
