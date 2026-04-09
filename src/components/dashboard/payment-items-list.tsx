"use client";

import { CreditCard, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PaymentItemRow } from "@/app/dashboard/[orgId]/payments/actions";

interface PaymentItemsListProps {
  orgSlug: string;
  items: PaymentItemRow[];
}

const TYPE_STYLES: Record<string, string> = {
  fee: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  donation: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  sponsorship: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  registration: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function PaymentItemsList({ orgSlug, items }: PaymentItemsListProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            No payment items yet. Create one to start accepting payments.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="size-4 text-muted-foreground" />
                <h4 className="font-semibold text-foreground">{item.title}</h4>
              </div>
              <Badge className={TYPE_STYLES[item.paymentType] ?? ""}>
                {item.paymentType}
              </Badge>
            </div>
            {item.description && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-foreground">
                {formatCents(item.amount, item.currency)}
              </span>
              <Badge variant={item.isActive ? "default" : "secondary"}>
                {item.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                const url = `${window.location.origin}/o/${orgSlug}/pay/${item.id}`;
                navigator.clipboard.writeText(url);
              }}
            >
              <ExternalLink className="size-3.5" data-icon="inline-start" />
              Copy Payment Link
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
