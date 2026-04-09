import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Privacy Policy | YSO Connect",
  description:
    "Learn how YSO Connect collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Effective Date: April 8, 2026
          </p>

          <div className="mt-10 space-y-10 text-base leading-7 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground">
                1. Introduction
              </h2>
              <p className="mt-3">
                YSO Connect (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
                provides a communication and management platform for youth
                sports organizations. This Privacy Policy explains how we
                collect, use, disclose, and safeguard your information when you
                use our website and services at ysoconnect.com.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                2. Information We Collect
              </h2>
              <p className="mt-3">
                We collect information that you provide directly to us,
                including:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>
                  <strong className="text-foreground">Account Information:</strong>{" "}
                  Name, email address, and password when you create an account.
                </li>
                <li>
                  <strong className="text-foreground">Phone Numbers:</strong>{" "}
                  Mobile phone numbers provided for SMS communications about
                  team activities.
                </li>
                <li>
                  <strong className="text-foreground">Player Information:</strong>{" "}
                  Player names, ages, and team assignments provided by
                  parents/guardians or organization administrators.
                </li>
                <li>
                  <strong className="text-foreground">Payment Information:</strong>{" "}
                  Billing details processed through our payment provider for
                  registration fees and other organization charges.
                </li>
                <li>
                  <strong className="text-foreground">Usage Data:</strong>{" "}
                  Information about how you interact with our services, including
                  IP addresses, browser type, and pages visited.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                3. How We Use Your Information
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>
                  Sending SMS and email notifications about team schedules,
                  practice changes, game updates, and cancellations.
                </li>
                <li>
                  Managing organization memberships, rosters, and team
                  assignments.
                </li>
                <li>Processing registration fees and payments.</li>
                <li>
                  Providing customer support and responding to inquiries.
                </li>
                <li>
                  Improving our services and developing new features.
                </li>
                <li>
                  Ensuring the security and integrity of our platform.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                4. Third-Party Services
              </h2>
              <p className="mt-3">
                We use the following third-party services to operate our
                platform:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>
                  <strong className="text-foreground">Twilio</strong> for sending
                  SMS text messages.
                </li>
                <li>
                  <strong className="text-foreground">Resend</strong> for sending
                  email communications.
                </li>
                <li>
                  <strong className="text-foreground">Stripe</strong> for
                  processing payments securely. We do not store credit card
                  numbers on our servers.
                </li>
                <li>
                  <strong className="text-foreground">Clerk</strong> for user
                  authentication and account management.
                </li>
              </ul>
              <p className="mt-3">
                Each of these providers maintains their own privacy policies
                governing their handling of your data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                5. Data Retention
              </h2>
              <p className="mt-3">
                We retain your personal information for as long as your account
                is active or as needed to provide you services. We will retain
                and use your information as necessary to comply with our legal
                obligations, resolve disputes, and enforce our agreements. SMS
                consent records are retained for a minimum of five years as
                required by applicable regulations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                6. Children&apos;s Privacy (COPPA)
              </h2>
              <p className="mt-3">
                YSO Connect is designed for use by parents, guardians, and
                organization administrators — not by children directly. We do
                not knowingly collect personal information from children under
                13. All player information is provided by and managed through
                parent/guardian accounts. If you believe a child under 13 has
                provided us personal information directly, please contact us at{" "}
                <a
                  href="mailto:support@ysoconnect.com"
                  className="text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  support@ysoconnect.com
                </a>{" "}
                so we can promptly remove it.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                7. Your Rights
              </h2>
              <p className="mt-3">You have the right to:</p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>
                  <strong className="text-foreground">Access</strong> the
                  personal information we hold about you.
                </li>
                <li>
                  <strong className="text-foreground">Correct</strong> any
                  inaccurate or incomplete personal information.
                </li>
                <li>
                  <strong className="text-foreground">Delete</strong> your
                  personal information, subject to legal retention requirements.
                </li>
                <li>
                  <strong className="text-foreground">Opt out</strong> of SMS
                  messages at any time by replying STOP to any message, or by
                  contacting us directly.
                </li>
                <li>
                  <strong className="text-foreground">Opt out</strong> of
                  marketing emails by using the unsubscribe link in any email.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                8. Data Security
              </h2>
              <p className="mt-3">
                We implement appropriate technical and organizational security
                measures to protect your personal information, including
                encryption in transit (TLS) and at rest. However, no method of
                transmission over the internet is 100% secure, and we cannot
                guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                9. Changes to This Policy
              </h2>
              <p className="mt-3">
                We may update this Privacy Policy from time to time. We will
                notify you of any material changes by posting the new policy on
                this page and updating the &quot;Effective Date&quot; above.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                10. Contact Us
              </h2>
              <p className="mt-3">
                If you have questions about this Privacy Policy or wish to
                exercise your rights, please contact us at:
              </p>
              <p className="mt-3">
                <a
                  href="mailto:support@ysoconnect.com"
                  className="text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  support@ysoconnect.com
                </a>
              </p>
            </section>

            <div className="border-t border-border pt-6 text-sm text-muted-foreground/70">
              <p>
                See also our{" "}
                <Link
                  href="/terms"
                  className="text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/consent"
                  className="text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  SMS Consent
                </Link>{" "}
                pages.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
