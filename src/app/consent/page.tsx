import type { Metadata } from "next";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";
import { GeneralSmsConsentForm } from "@/components/public/general-sms-consent-form";

export const metadata: Metadata = {
  title: "SMS Consent | YSO Connect",
  description:
    "Opt in to receive text messages from YSO Connect about your child's team activities, schedules, and important updates.",
};

export default function ConsentPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              SMS Text Message Consent
            </h1>
            <p className="mt-2 text-muted-foreground">
              Opt in to receive text message updates from YSO Connect and
              affiliated youth sports organizations.
            </p>
          </div>
          <GeneralSmsConsentForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
