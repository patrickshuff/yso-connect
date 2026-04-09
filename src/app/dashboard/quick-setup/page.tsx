"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { quickSetupTeam } from "./actions";

const SPORTS = [
  "Baseball",
  "Softball",
  "Soccer",
  "Football",
  "Basketball",
  "Other",
] as const;

export default function QuickSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [teamName, setTeamName] = useState("");
  const [sport, setSport] = useState("");
  const [seasonName, setSeasonName] = useState("Spring 2026");

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    const result = await quickSetupTeam(teamName, sport, seasonName);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Something went wrong");
      return;
    }

    setStep(2);
  };

  const handleGoToDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Quick Team Setup
      </h2>
      <p className="mb-8 text-zinc-600 dark:text-zinc-400">
        Get your team up and running in under a minute.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Team</CardTitle>
            <CardDescription>
              Tell us about your team. You can add players and guardians after
              setup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Westside Tigers"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Sport</Label>
                <Select value={sport} onValueChange={(val) => { if (val) setSport(val); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a sport" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPORTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seasonName">Season Name</Label>
                <Input
                  id="seasonName"
                  value={seasonName}
                  onChange={(e) => setSeasonName(e.target.value)}
                  placeholder="e.g. Spring 2026"
                  required
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || !teamName || !sport}
                >
                  {isSubmitting ? "Setting up..." : "Create My Team"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>You&apos;re All Set!</CardTitle>
            <CardDescription>
              Your team is ready. Next, add your players and their guardians.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="rounded-md border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Team
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {teamName}
                </p>
              </div>
              <div className="rounded-md border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Sport
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {sport}
                </p>
              </div>
              <div className="rounded-md border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Season
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {seasonName}
                </p>
              </div>
              <p className="pt-2 text-xs text-zinc-500">
                Your 30-day free trial has started. After that, it&apos;s just
                $5/month.
              </p>
            </div>

            <div className="mt-8 flex justify-end">
              <Button onClick={handleGoToDashboard}>Go to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
