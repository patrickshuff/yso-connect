"use client";

import { useActionState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { submitInterestForm } from "@/app/o/[slug]/signup/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { trackFunnelEvent } from "@/lib/gtm";

interface InterestFormProps {
  slug: string;
  orgName: string;
  sportNames: string[];
}

export function InterestForm({ slug, orgName, sportNames }: InterestFormProps) {
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(submitInterestForm, {
    success: false,
    error: null,
  });
  const hasTrackedSuccess = useRef(false);

  const utmSource = searchParams.get("utm_source") ?? "";
  const utmMedium = searchParams.get("utm_medium") ?? "";
  const utmCampaign = searchParams.get("utm_campaign") ?? "";
  const utmTerm = searchParams.get("utm_term") ?? "";
  const utmContent = searchParams.get("utm_content") ?? "";
  const landingPage = searchParams.get("landing_page") ?? "";
  const referrer = typeof document === "undefined" ? "" : document.referrer;

  useEffect(() => {
    if (!state.success || hasTrackedSuccess.current) {
      return;
    }

    hasTrackedSuccess.current = true;
    trackFunnelEvent("funnel_signup_submitted", {
      organizationSlug: slug,
      location: "org_interest_form",
    });
  }, [slug, state.success]);

  if (state.success) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <CheckCircle2 className="size-12 text-green-600 dark:text-green-400" />
          <h3 className="text-xl font-semibold text-foreground">
            Thank you for your interest!
          </h3>
          <p className="max-w-md text-center text-muted-foreground">
            Your information has been submitted to {orgName}. They will reach
            out to you soon with more details.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interest Form</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="utmSource" value={utmSource} />
          <input type="hidden" name="utmMedium" value={utmMedium} />
          <input type="hidden" name="utmCampaign" value={utmCampaign} />
          <input type="hidden" name="utmTerm" value={utmTerm} />
          <input type="hidden" name="utmContent" value={utmContent} />
          <input type="hidden" name="referrer" value={referrer} />
          <input type="hidden" name="landingPage" value={landingPage} />

          {state.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {state.error}
            </div>
          )}

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground">
              Parent / Guardian Information
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="parentName">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="parentName"
                  name="parentName"
                  required
                  placeholder="Jane Smith"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentEmail">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="parentEmail"
                  name="parentEmail"
                  type="email"
                  required
                  placeholder="jane@example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentPhone">Phone Number</Label>
              <Input
                id="parentPhone"
                name="parentPhone"
                type="tel"
                placeholder="(555) 123-4567"
              />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground">
              Child Information
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="childName">Child&apos;s Name</Label>
                <Input
                  id="childName"
                  name="childName"
                  placeholder="Alex Smith"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="childAge">Child&apos;s Age</Label>
                <Input
                  id="childAge"
                  name="childAge"
                  type="number"
                  min="3"
                  max="18"
                  placeholder="10"
                />
              </div>
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="sportInterest">Sport Interest</Label>
            {sportNames.length > 0 ? (
              <select
                id="sportInterest"
                name="sportInterest"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select a sport...</option>
                {sportNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id="sportInterest"
                name="sportInterest"
                placeholder="Soccer, Basketball, etc."
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              name="message"
              rows={4}
              placeholder="Any questions or additional information..."
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Submitting..." : "Submit Interest Form"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
