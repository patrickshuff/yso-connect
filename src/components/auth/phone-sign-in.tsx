"use client";

import { useEffect, useState } from "react";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
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
type Step = "identifier" | "otp";

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

export function PhoneSignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();
  const { signIn, fetchStatus } = useSignIn();

  // Support prefill from ?phone= and ?email= so the sign-up flow can
  // redirect to sign-in when the identifier is already taken.
  const prefillPhoneE164 = searchParams.get("phone") ?? "";
  const prefillEmail = searchParams.get("email") ?? "";

  function formatPhoneFromE164(e164: string): string {
    const digits = e164.replace(/\D/g, "");
    const ten = digits.startsWith("1") ? digits.slice(1) : digits;
    return formatPhone(ten.slice(0, 10));
  }

  const [method, setMethod] = useState<Method>(
    prefillEmail ? "email" : "phone",
  );
  const [step, setStep] = useState<Step>("identifier");
  const [displayPhone, setDisplayPhone] = useState(() =>
    prefillPhoneE164 ? formatPhoneFromE164(prefillPhoneE164) : "",
  );
  const [email, setEmail] = useState(prefillEmail);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(
    prefillPhoneE164 || prefillEmail
      ? "You already have an account — enter the code we send to sign in."
      : null,
  );

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isSignedIn, router]);

  if (isSignedIn) return null;

  const loading = fetchStatus === "fetching";

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Strip the "+1 " prefix before extracting digits so it doesn't count
    // as an extra digit and corrupt the formatted output on each keystroke.
    const withoutPrefix = e.target.value.replace(/^\+?1[\s\-.]?/, "");
    const raw = withoutPrefix.replace(/\D/g, "").slice(0, 10);
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
    if (!signIn) return;

    if (isSignedIn) {
      router.replace("/dashboard");
      return;
    }

    setError(null);

    if (method === "phone") {
      const { error: createErr } = await signIn.create({
        identifier: toE164(displayPhone),
      });
      if (createErr) {
        setError(createErr.message);
        return;
      }
      const { error: sendErr } = await signIn.phoneCode.sendCode();
      if (sendErr) {
        setError(sendErr.message);
        return;
      }
    } else {
      const { error: createErr } = await signIn.create({ identifier: email });
      if (createErr) {
        setError(createErr.message);
        return;
      }
      const { error: sendErr } = await signIn.emailCode.sendCode();
      if (sendErr) {
        setError(sendErr.message);
        return;
      }
    }

    setStep("otp");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn) return;
    setError(null);

    if (method === "phone") {
      const { error: verifyErr } = await signIn.phoneCode.verifyCode({
        code: otp,
      });
      if (verifyErr) {
        setError(verifyErr.message);
        return;
      }
    } else {
      const { error: verifyErr2 } = await signIn.emailCode.verifyCode({ code: otp });
      if (verifyErr2) {
        setError(verifyErr2.message);
        return;
      }
    }

    if (signIn.status !== "complete") {
      setError("Sign-in incomplete. Please try again.");
      return;
    }

    const { error: finalizeErr } = await signIn.finalize({
      navigate: ({ decorateUrl }) => {
        const url = decorateUrl("/dashboard");
        if (url.startsWith("http")) {
          window.location.href = url;
        } else {
          router.push(url);
        }
      },
    });
    if (finalizeErr) {
      setError(finalizeErr.message);
    }
  }

  const sentTo = method === "phone" ? displayPhone : email;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          {step === "identifier"
            ? "Enter your phone number or email to receive a one-time code."
            : `We sent a 6-digit code to ${sentTo}.`}
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

        {step === "identifier" ? (
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
            <Button
              type="submit"
              disabled={loading || (method === "phone" ? !displayPhone : !email)}
            >
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
                setStep("identifier");
                setOtp("");
                setError(null);
              }}
            >
              {method === "phone" ? "Use a different number" : "Use a different email"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
