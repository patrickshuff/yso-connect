"use client";

import { useCallback, useState } from "react";
import { useClerk, useSignUp } from "@clerk/nextjs";
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

type Method = "phone" | "email";
type Step = "identifier" | "otp" | "profile";

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
  const { setActive } = useClerk();
  const { signUp, fetchStatus } = useSignUp();

  const [method, setMethod] = useState<Method>("phone");
  const [step, setStep] = useState<Step>("identifier");
  const [displayPhone, setDisplayPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loading = fetchStatus === "fetching";

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    let digits = e.target.value.replace(/\D/g, "");
    // Strip country code: our format always prefixes "+1", so "1" ends up as
    // the first extracted digit on every keystroke. US area codes never start
    // with 1, so it's always safe to drop it.
    if (digits.startsWith("1")) {
      digits = digits.slice(1);
    }
    const raw = digits.slice(0, 10);
    setDisplayPhone(formatPhone(raw));
    setError(null);
  }

  function switchMethod(m: Method) {
    setMethod(m);
    setStep("identifier");
    setDisplayPhone("");
    setEmail("");
    setOtp("");
    setError(null);
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp) return;
    setError(null);

    if (method === "phone") {
      const { error: createErr } = await signUp.create({ phoneNumber: toE164(displayPhone) });
      if (createErr) { setError(createErr.message); return; }
      const { error: sendErr } = await signUp.verifications.sendPhoneCode();
      if (sendErr) { setError(sendErr.message); return; }
    } else {
      const { error: createErr } = await signUp.create({ emailAddress: email });
      if (createErr) { setError(createErr.message); return; }
      const { error: sendErr } = await signUp.verifications.sendEmailCode();
      if (sendErr) { setError(sendErr.message); return; }
    }

    setStep("otp");
  }

  const activateSession = useCallback(async () => {
    if (!signUp?.createdSessionId || !setActive) return;
    await setActive({ session: signUp.createdSessionId });
    router.push("/dashboard");
  }, [signUp, setActive, router]);

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp) return;
    setError(null);

    if (method === "phone") {
      const { error: verifyErr } = await signUp.verifications.verifyPhoneCode({ code: otp });
      if (verifyErr) { setError(verifyErr.message); return; }
    } else {
      const { error: verifyErr } = await signUp.verifications.verifyEmailCode({ code: otp });
      if (verifyErr) { setError(verifyErr.message); return; }
    }

    if (signUp.status === "complete") {
      // Name not required by Clerk — activate session immediately
      await activateSession();
      return;
    }

    // Name fields still required — show profile step
    const missing = signUp.missingFields ?? [];
    if (missing.some((f) => f === "first_name" || f === "last_name")) {
      setStep("profile");
      return;
    }

    setError(`Missing required fields: ${missing.join(", ")}`);
  }

  async function handleFinalize(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp) return;
    setError(null);

    const { error: updateErr } = await signUp.update({ firstName, lastName });
    if (updateErr) {
      setError(updateErr.message);
      return;
    }

    if (signUp.status !== "complete") {
      setError("Sign-up incomplete after name update. Please try again.");
      return;
    }

    await activateSession();
  }

  const sentTo = method === "phone" ? displayPhone : email;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>
          {step === "identifier"
            ? "Enter your phone number or email to get started."
            : step === "otp"
              ? `We sent a 6-digit code to ${sentTo}.`
              : "Almost done! Tell us your name."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {step === "identifier" && (
          <div className="flex rounded-lg border border-input overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => switchMethod("phone")}
              className={`flex-1 py-1.5 font-medium transition-colors ${
                method === "phone"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              Phone
            </button>
            <button
              type="button"
              onClick={() => switchMethod("email")}
              className={`flex-1 py-1.5 font-medium transition-colors ${
                method === "email"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              Email
            </button>
          </div>
        )}

        {step === "identifier" && (
          <form onSubmit={handleSendCode} className="flex flex-col gap-4">
            {method === "phone" ? (
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
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  autoComplete="email"
                  required
                />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div id="clerk-captcha" />
            <Button
              type="submit"
              disabled={loading || (method === "phone" ? !displayPhone : !email)}
            >
              {loading ? "Sending…" : "Send code"}
            </Button>
          </form>
        )}

        {step === "otp" && (
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
                setStep("identifier");
                setOtp("");
                setError(null);
              }}
            >
              {method === "phone" ? "Use a different number" : "Use a different email"}
            </Button>
          </form>
        )}

        {step === "profile" && (
          <form onSubmit={handleFinalize} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Jane"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); setError(null); }}
                autoComplete="given-name"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Smith"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); setError(null); }}
                autoComplete="family-name"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading || !firstName || !lastName}>
              {loading ? "Saving…" : "Continue"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
