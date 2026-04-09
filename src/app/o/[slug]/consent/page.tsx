import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { OrgHeader } from "@/components/public/org-header";
import { OrgFooter } from "@/components/public/org-footer";
import { SmsConsentForm } from "@/components/public/sms-consent-form";

async function getOrgBySlug(slug: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);
  return org ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);

  if (!org) {
    return { title: "Organization Not Found" };
  }

  return {
    title: `SMS Consent | ${org.name} | YSO Connect`,
    description: `Opt in to receive text messages from ${org.name} about your child's team activities.`,
  };
}

export default async function ConsentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);

  if (!org) {
    notFound();
  }

  return (
    <>
      <OrgHeader orgName={org.name} slug={slug} />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              SMS Text Message Consent
            </h1>
            <p className="mt-2 text-muted-foreground">
              Opt in to receive text message updates from {org.name}.
            </p>
          </div>
          <SmsConsentForm slug={slug} orgName={org.name} />
        </div>
      </main>
      <OrgFooter orgName={org.name} slug={slug} />
    </>
  );
}
