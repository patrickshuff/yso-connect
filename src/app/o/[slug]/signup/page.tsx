import { notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/db";
import { organizations, sports } from "@/db/schema";
import { OrgHeader } from "@/components/public/org-header";
import { OrgFooter } from "@/components/public/org-footer";
import { InterestForm } from "@/components/public/interest-form";
import { FunnelPageView } from "@/components/analytics/funnel-page-view";

async function getOrgBySlug(slug: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);
  return org ?? null;
}

async function getOrgSportNames(orgId: string) {
  const rows = await db
    .select({ name: sports.name })
    .from(sports)
    .where(eq(sports.organizationId, orgId))
    .orderBy(asc(sports.name));
  return rows.map((r) => r.name);
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
    title: `Join ${org.name} | YSO Connect`,
    description: `Express your interest in joining ${org.name}. Fill out our signup form to get started.`,
  };
}

export default async function SignupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);

  if (!org) {
    notFound();
  }

  const sportNames = await getOrgSportNames(org.id);

  return (
    <>
      <OrgHeader orgName={org.name} slug={slug} />
      <main className="flex-1">
        <FunnelPageView organizationSlug={slug} location="org_signup_page" />
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Join {org.name}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Fill out the form below to express your interest. We will be in
              touch shortly.
            </p>
          </div>
          <InterestForm
            slug={slug}
            orgName={org.name}
            sportNames={sportNames}
          />
        </div>
      </main>
      <OrgFooter orgName={org.name} slug={slug} />
    </>
  );
}
