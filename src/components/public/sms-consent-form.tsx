"use client";

import { useActionState } from "react";
import { submitSmsConsent } from "@/app/o/[slug]/consent/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

interface SmsConsentFormProps {
  slug: string;
  orgName: string;
}

function buildConsentText(orgName: string): string {
  return `By providing your phone number and checking the box below, you consent to receive text messages from ${orgName} via YSO Connect regarding your child's team activities, including game/practice schedules, cancellations, and important updates. Message frequency varies. Message and data rates may apply. Reply STOP to opt out at any time. Reply HELP for help.`;
}

export function SmsConsentForm({ slug, orgName }: SmsConsentFormProps) {
  const consentText = buildConsentText(orgName);

  const [state, formAction, isPending] = useActionState(submitSmsConsent, {
    success: false,
    error: null,
  });

  if (state.success) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <CheckCircle2 className="size-12 text-green-600 dark:text-green-400" />
          <h3 className="text-xl font-semibold text-foreground">
            Consent Recorded
          </h3>
          <p className="max-w-md text-center text-muted-foreground">
            Thank you! Your SMS consent for {orgName} has been recorded. You
            will now receive text message updates about your child&apos;s team
            activities.
          </p>
          <p className="text-xs text-muted-foreground">
            You can opt out at any time by replying STOP to any message.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMS Consent</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="consentText" value={consentText} />

          {state.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {state.error}
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm leading-relaxed text-muted-foreground">
            {consentText}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">
              Phone Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              required
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardianName">Your Name (optional)</Label>
            <Input
              id="guardianName"
              name="guardianName"
              placeholder="Jane Smith"
            />
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="consentChecked"
              name="consentChecked"
              required
              className="mt-1 h-4 w-4 rounded border border-input accent-primary"
            />
            <Label
              htmlFor="consentChecked"
              className="text-sm leading-relaxed font-normal cursor-pointer"
            >
              I agree to receive text messages from {orgName} via YSO Connect as
              described above.
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Submitting..." : "Give Consent"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
