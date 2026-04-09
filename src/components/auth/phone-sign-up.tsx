"use client";

import { useState } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Step = "phone" | "otp";

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `+1 (${digits}`;
  if (digits.length <= 6)
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function toE164(formatted: string): string {
  const digits = formatted.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

export function PhoneSignUp() {
  const router = useRouter();
  const { signUp, fetchStatus } = useSignUp();

  const [step, setStep] = useState<Step>("phone");
  const [displayPhone, setDisplayPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loading = fetchStatus === "fetching";

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setDisplayPhone(formatPhone(raw));
    setError(null);
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp) return;
    setError(null);

    const { error: createErr } = await signUp.create({
      phoneNumber: toE164(displayPhone),
    });
    if (createErr) {
      setError(createErr.message);
      return;
    }

    const { error: sendErr } = await signUp.verifications.sendPhoneCode();
    if (sendErr) {
      setError(sendErr.message);
      return;
    }

    setStep("otp");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp) return;
    setError(null);

    const { error: verifyErr } = await signUp.verifications.verifyPhoneCode({
      code: otp,
    });
    if (verifyErr) {
      setError(verifyErr.message);
      return;
    }

    const { error: finalizeErr } = await signUp.finalize();
    if (finalizeErr) {
      setError(finalizeErr.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>
          {step === "phone"
            ? "Enter your phone number to get started."
            : `We sent a 6-digit code to ${displayPhone}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "phone" ? (
          <form onSubmit={handleSendCode} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={displayPhone}
                onChange={handlePhoneChange}
                autoComplete="tel"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading || !displayPhone}>
              {loading ? "Sending…" : "Send code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="otp">One-time code</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setError(null);
                }}
                autoComplete="one-time-code"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading || otp.length !== 6}>
              {loading ? "Verifying…" : "Verify code"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep("phone");
                setOtp("");
                setError(null);
              }}
            >
              Use a different number
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
