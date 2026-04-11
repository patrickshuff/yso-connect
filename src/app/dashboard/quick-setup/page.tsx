"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { quickSetupTeam } from "./actions";

const SPORTS = [
  "Baseball",
  "Basketball",
  "Football",
  "Soccer",
  "Softball",
  "T-Ball",
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${step === 1 ? "bg-primary text-primary-foreground" : "bg-primary text-primary-foreground"}`}>
            {step === 2 ? <CheckCircle2 className="size-4" /> : "1"}
          </div>
          <div className={`h-0.5 w-12 ${step === 2 ? "bg-primary" : "bg-zinc-200 dark:bg-zinc-700"}`} />
          <div className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${step === 2 ? "bg-primary text-primary-foreground" : "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"}`}>
            2
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        {step === 1 && (
          <Card className="border-2 shadow-sm">
            <CardHeader>
              <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Step 1 of 2
              </div>
              <CardTitle>Your Team</CardTitle>
              <CardDescription>
                Tell us about your team. You can add players and guardians after setup.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}
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
                        <SelectItem key={s} value={s}>{s}</SelectItem>
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

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting || !teamName || !sport}
                  >
                    {isSubmitting ? "Setting up…" : "Create My Team"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-2 shadow-sm">
            <CardHeader className="text-center">
              <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Step 2 of 2
              </div>
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Team Created!</CardTitle>
              <CardDescription>
                Your team is ready. Next, add your players and their guardians.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="rounded-lg border bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Team</p>
                  <p className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-50">{teamName}</p>
                </div>
                <div className="rounded-lg border bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Sport</p>
                  <p className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-50">{sport}</p>
                </div>
                <div className="rounded-lg border bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Season</p>
                  <p className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-50">{seasonName}</p>
                </div>
                <p className="pt-1 text-center text-xs text-muted-foreground">
                  Your 30-day free trial has started · $10 for 6 months after that · Cancel anytime
                </p>
              </div>
              <div className="mt-6">
                <Button className="w-full" onClick={() => router.push("/dashboard")}>
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
