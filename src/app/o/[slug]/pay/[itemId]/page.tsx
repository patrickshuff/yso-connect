import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { CreditCard } from "lucide-react";
import { db } from "@/db";
import { paymentItems, organizations } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrgHeader } from "@/components/public/org-header";
import { OrgFooter } from "@/components/public/org-footer";
import { PayNowButton } from "@/components/public/pay-now-button";

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

const TYPE_STYLES: Record<string, string> = {
  fee: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  donation: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  sponsorship: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  registration: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export default async function PublicPaymentPage({
  params,
}: {
  params: Promise<{ slug: string; itemId: string }>;
}) {
  const { slug, itemId } = await params;

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  if (!org) {
    notFound();
  }

  const [item] = await db
    .select()
    .from(paymentItems)
    .where(
      and(
        eq(paymentItems.id, itemId),
        eq(paymentItems.organizationId, org.id),
        eq(paymentItems.isActive, true),
      ),
    );

  if (!item) {
    notFound();
  }

  return (
    <>
      <OrgHeader orgName={org.name} slug={slug} />
      <main className="flex-1">
        <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
                <CreditCard className="size-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">{item.title}</CardTitle>
              <Badge className={`mx-auto mt-2 ${TYPE_STYLES[item.paymentType] ?? ""}`}>
                {item.paymentType}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              {item.description && (
                <p className="text-sm text-muted-foreground">{item.description}</p>
              )}
              <p className="text-4xl font-bold text-foreground">
                {formatCents(item.amount, item.currency)}
              </p>
              <PayNowButton slug={slug} itemId={item.id} />
            </CardContent>
          </Card>
        </div>
      </main>
      <OrgFooter orgName={org.name} slug={slug} />
    </>
  );
}
