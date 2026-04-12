"use client";

import { CreditCard, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
          <div className="flex flex-col items-center gap-2 py-12">
            <CreditCard className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No payment items yet. Create one to start accepting payments.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  <div>{item.title}</div>
                  {item.description && (
                    <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {item.description}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={TYPE_STYLES[item.paymentType] ?? ""}>
                    {item.paymentType}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold">
                  {formatCents(item.amount, item.currency)}
                </TableCell>
                <TableCell>
                  <Badge variant={item.isActive ? "default" : "secondary"}>
                    {item.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = `${window.location.origin}/o/${orgSlug}/pay/${item.id}`;
                      navigator.clipboard.writeText(url);
                    }}
                  >
                    <ExternalLink className="size-3.5" data-icon="inline-start" />
                    Copy Link
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
