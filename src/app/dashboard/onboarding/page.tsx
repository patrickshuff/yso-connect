"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { createOrganization, createSeason, addSports } from "./actions";
import { trackFunnelEvent } from "@/lib/gtm";

const STEP_LABELS = ["Organization", "Season", "Sports", "Done"];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Org state
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgTimezone, setOrgTimezone] = useState("America/New_York");
  const [orgId, setOrgId] = useState<string | null>(null);

  // Step 2: Season state
  const [seasonName, setSeasonName] = useState("");
  const [seasonStartDate, setSeasonStartDate] = useState("");
  const [seasonEndDate, setSeasonEndDate] = useState("");

  // Step 3: Sports state
  const [sportsList, setSportsList] = useState<string[]>([]);
  const [newSport, setNewSport] = useState("");

  // Summary state
  const [createdSeason, setCreatedSeason] = useState<string | null>(null);
  const [createdSportsCount, setCreatedSportsCount] = useState(0);

  const handleOrgNameChange = useCallback((value: string) => {
    setOrgName(value);
    setOrgSlug(slugify(value));
  }, []);

  const handleAddSport = useCallback(() => {
    const trimmed = newSport.trim();
    if (trimmed && !sportsList.includes(trimmed)) {
      setSportsList((prev) => [...prev, trimmed]);
      setNewSport("");
    }
  }, [newSport, sportsList]);

  const handleRemoveSport = useCallback((sport: string) => {
    setSportsList((prev) => prev.filter((s) => s !== sport));
  }, []);

  const handleStep1Submit = async () => {
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("name", orgName);
    formData.set("slug", orgSlug);
    formData.set("description", orgDescription);
    formData.set("contactEmail", orgEmail);
    formData.set("contactPhone", orgPhone);
    formData.set("timezone", orgTimezone);

    const result = await createOrganization(formData);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Failed to create organization");
      return;
    }

    setOrgId(result.orgId ?? null);
    trackFunnelEvent("funnel_org_activation", {
      organizationId: result.orgId,
      organizationSlug: orgSlug,
      location: "onboarding_step_organization",
    });
    setCurrentStep(2);
  };

  const handleStep2Submit = async () => {
    if (!orgId) return;
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("orgId", orgId);
    formData.set("name", seasonName);
    formData.set("startDate", seasonStartDate);
    formData.set("endDate", seasonEndDate);

    const result = await createSeason(formData);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Failed to create season");
      return;
    }

    setCreatedSeason(seasonName);
    setCurrentStep(3);
  };

  const handleStep3Submit = async () => {
    if (!orgId) return;
    setIsSubmitting(true);
    setError(null);

    const result = await addSports(orgId, sportsList);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Failed to add sports");
      return;
    }

    setCreatedSportsCount(sportsList.length);
    setCurrentStep(4);
  };

  const handleGoToDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Set Up Your Organization
      </h2>
      <p className="mb-8 text-zinc-600 dark:text-zinc-400">
        Get started by creating your organization, season, and sports.
      </p>

      <StepIndicator
        currentStep={currentStep}
        totalSteps={4}
        stepLabels={STEP_LABELS}
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Create Organization</CardTitle>
            <CardDescription>
              Enter details about your youth sports organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleStep1Submit();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name *</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => handleOrgNameChange(e.target.value)}
                  placeholder="e.g. Westside Youth Athletics"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgSlug">Slug *</Label>
                <Input
                  id="orgSlug"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  placeholder="e.g. westside-youth-athletics"
                  required
                />
                <p className="text-xs text-zinc-500">
                  URL-friendly identifier. Auto-generated from the name.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgDescription">Description</Label>
                <Textarea
                  id="orgDescription"
                  value={orgDescription}
                  onChange={(e) => setOrgDescription(e.target.value)}
                  placeholder="A brief description of your organization"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orgEmail">Contact Email</Label>
                  <Input
                    id="orgEmail"
                    type="email"
                    value={orgEmail}
                    onChange={(e) => setOrgEmail(e.target.value)}
                    placeholder="contact@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgPhone">Contact Phone</Label>
                  <Input
                    id="orgPhone"
                    type="tel"
                    value={orgPhone}
                    onChange={(e) => setOrgPhone(e.target.value)}
                    placeholder="(555) 555-5555"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgTimezone">Timezone</Label>
                <Input
                  id="orgTimezone"
                  value={orgTimezone}
                  onChange={(e) => setOrgTimezone(e.target.value)}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSubmitting || !orgName || !orgSlug}>
                  {isSubmitting ? "Creating..." : "Next: Create Season"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Create First Season</CardTitle>
            <CardDescription>
              Set up your first season with a name and date range.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleStep2Submit();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="seasonName">Season Name *</Label>
                <Input
                  id="seasonName"
                  value={seasonName}
                  onChange={(e) => setSeasonName(e.target.value)}
                  placeholder="e.g. Spring 2026"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={seasonStartDate}
                    onChange={(e) => setSeasonStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={seasonEndDate}
                    onChange={(e) => setSeasonEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || !seasonName || !seasonStartDate || !seasonEndDate}
                >
                  {isSubmitting ? "Creating..." : "Next: Add Sports"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Add Sports</CardTitle>
            <CardDescription>
              Add the sports your organization offers. You can add more later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="newSport" className="sr-only">
                    Sport Name
                  </Label>
                  <Input
                    id="newSport"
                    value={newSport}
                    onChange={(e) => setNewSport(e.target.value)}
                    placeholder="e.g. Baseball, Soccer, Basketball"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSport();
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddSport}
                  disabled={!newSport.trim()}
                >
                  Add
                </Button>
              </div>

              {sportsList.length > 0 && (
                <ul className="space-y-2">
                  {sportsList.map((sport) => (
                    <li
                      key={sport}
                      className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-2 dark:border-zinc-800"
                    >
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {sport}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSport(sport)}
                        className="text-zinc-500 hover:text-red-600"
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              {sportsList.length === 0 && (
                <p className="text-sm text-zinc-500">
                  No sports added yet. Add at least one sport to continue.
                </p>
              )}

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => void handleStep3Submit()}
                  disabled={isSubmitting || sportsList.length === 0}
                >
                  {isSubmitting ? "Saving..." : "Finish Setup"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>You&apos;re All Set!</CardTitle>
            <CardDescription>
              Your organization is ready to go. Here&apos;s a summary of what was created.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="rounded-md border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Organization
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {orgName}
                </p>
              </div>

              {createdSeason && (
                <div className="rounded-md border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Season
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {createdSeason}
                  </p>
                </div>
              )}

              <div className="rounded-md border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Sports ({createdSportsCount})
                </p>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  {sportsList.join(", ")}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Your 30-day free trial has started
              </p>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                After your trial, continued access is $49/mo. You can set up billing anytime from your dashboard.
              </p>
            </div>

            <div className="mt-8 flex justify-end">
              <Button onClick={handleGoToDashboard}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
