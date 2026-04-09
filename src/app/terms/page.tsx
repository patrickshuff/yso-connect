import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Terms of Service | YSO Connect",
  description:
    "Read the terms and conditions governing your use of the YSO Connect platform.",
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Effective Date: April 8, 2026
          </p>

          <div className="mt-10 space-y-10 text-base leading-7 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground">
                1. Acceptance of Terms
              </h2>
              <p className="mt-3">
                By accessing or using YSO Connect (&quot;the Service&quot;),
                available at ysoconnect.com, you agree to be bound by these
                Terms of Service. If you do not agree to these terms, you may
                not use the Service. If you are using the Service on behalf of
                an organization, you represent that you have the authority to
                bind that organization to these terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                2. Description of Service
              </h2>
              <p className="mt-3">
                YSO Connect is a communication and management platform for youth
                sports organizations. The Service enables organizations to
                manage teams, players, schedules, and communications with
                parents and guardians via SMS, email, and web-based tools.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                3. User Accounts
              </h2>
              <p className="mt-3">
                You are responsible for maintaining the confidentiality of your
                account credentials and for all activities that occur under your
                account. You must provide accurate, current, and complete
                information during registration and keep your account
                information updated. You must notify us immediately of any
                unauthorized use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                4. Acceptable Use
              </h2>
              <p className="mt-3">You agree not to:</p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>
                  Use the Service for any unlawful purpose or in violation of
                  any applicable laws or regulations.
                </li>
                <li>
                  Send unsolicited or unauthorized messages, spam, or bulk
                  communications through the Service.
                </li>
                <li>
                  Impersonate any person or entity, or misrepresent your
                  affiliation with a person or entity.
                </li>
                <li>
                  Interfere with or disrupt the Service, servers, or networks
                  connected to the Service.
                </li>
                <li>
                  Attempt to gain unauthorized access to any portion of the
                  Service or any other accounts, systems, or networks.
                </li>
                <li>
                  Use the Service to collect, store, or process personal
                  information of minors except through parent/guardian accounts
                  as intended by the platform.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                5. Payment Terms
              </h2>
              <p className="mt-3">
                Certain features of the Service require payment by organizations
                or their members. All payments are processed through Stripe. By
                making a payment, you agree to Stripe&apos;s terms of service.
                Organization administrators are responsible for setting fees and
                communicating payment requirements to their members. Refund
                policies are set by individual organizations; YSO Connect does
                not issue refunds for payments made to organizations unless
                required by law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                6. SMS Communications
              </h2>
              <p className="mt-3">
                By consenting to receive SMS messages through the Service, you
                acknowledge that message and data rates may apply, message
                frequency varies, and you can opt out at any time by replying
                STOP. For full details, see our{" "}
                <Link
                  href="/consent"
                  className="text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  SMS Consent
                </Link>{" "}
                page.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                7. Intellectual Property
              </h2>
              <p className="mt-3">
                The Service and its original content, features, and
                functionality are and will remain the exclusive property of YSO
                Connect and its licensors. The Service is protected by
                copyright, trademark, and other laws. You may not reproduce,
                distribute, modify, or create derivative works of any portion of
                the Service without our prior written consent.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                8. Limitation of Liability
              </h2>
              <p className="mt-3">
                To the maximum extent permitted by law, YSO Connect and its
                officers, directors, employees, and agents shall not be liable
                for any indirect, incidental, special, consequential, or
                punitive damages, including without limitation loss of profits,
                data, use, goodwill, or other intangible losses, resulting from
                your access to or use of (or inability to access or use) the
                Service. In no event shall our total liability exceed the amount
                you have paid to us in the twelve months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                9. Disclaimer of Warranties
              </h2>
              <p className="mt-3">
                The Service is provided &quot;as is&quot; and &quot;as
                available&quot; without warranties of any kind, either express or
                implied, including but not limited to implied warranties of
                merchantability, fitness for a particular purpose, and
                non-infringement. We do not warrant that the Service will be
                uninterrupted, secure, or error-free.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                10. Termination
              </h2>
              <p className="mt-3">
                We may terminate or suspend your account and access to the
                Service immediately, without prior notice or liability, for any
                reason, including if you breach these Terms. Upon termination,
                your right to use the Service will immediately cease.
                Organization administrators may export their data prior to
                account closure by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                11. Governing Law
              </h2>
              <p className="mt-3">
                These Terms shall be governed by and construed in accordance
                with the laws of the State of Ohio, without regard to its
                conflict of law provisions. Any legal action or proceeding
                arising under these Terms shall be brought exclusively in the
                courts located in the State of Ohio.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                12. Changes to Terms
              </h2>
              <p className="mt-3">
                We reserve the right to modify these Terms at any time. We will
                provide notice of material changes by posting the revised terms
                on this page and updating the &quot;Effective Date.&quot; Your
                continued use of the Service after any changes constitutes
                acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                13. Contact Us
              </h2>
              <p className="mt-3">
                If you have questions about these Terms, please contact us at:
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
                  href="/privacy"
                  className="text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  Privacy Policy
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
