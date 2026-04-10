import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { getPaymentItems, getPayments } from "./actions";
import { CreatePaymentDialog } from "@/components/dashboard/create-payment-dialog";
import { PaymentItemsList } from "@/components/dashboard/payment-items-list";
import { PaymentHistoryTable } from "@/components/dashboard/payment-history-table";

export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const [items, paymentRows, orgRows] = await Promise.all([
    getPaymentItems(orgId),
    getPayments(orgId),
    db.select({ slug: organizations.slug }).from(organizations).where(eq(organizations.id, orgId)),
  ]);

  const org = orgRows[0];
  if (!org) {
    return <div className="p-8 text-center text-muted-foreground">Organization not found.</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Payments
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage payment items and view payment history.
          </p>
        </div>
        <CreatePaymentDialog orgId={orgId} />
      </div>

      <PaymentItemsList orgSlug={org.slug} items={items} />

      <div>
        <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Payment History
        </h3>
        <PaymentHistoryTable payments={paymentRows} />
      </div>
    </div>
  );
}
