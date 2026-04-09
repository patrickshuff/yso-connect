"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPaymentItem } from "@/app/dashboard/[orgId]/payments/actions";

interface CreatePaymentDialogProps {
  orgId: string;
}

const PAYMENT_TYPES = [
  { value: "fee", label: "Fee" },
  { value: "donation", label: "Donation" },
  { value: "sponsorship", label: "Sponsorship" },
  { value: "registration", label: "Registration" },
] as const;

export function CreatePaymentDialog({ orgId }: CreatePaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [paymentType, setPaymentType] = useState<string>("fee");

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    formData.set("paymentType", paymentType);

    const result = await createPaymentItem(orgId, formData);

    setPending(false);
    if (result.success) {
      setOpen(false);
      setPaymentType("fee");
    } else {
      setError(result.error ?? "Failed to create payment item");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" data-icon="inline-start" />
        Create Payment Item
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Payment Item</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment-title">Title</Label>
            <Input
              id="payment-title"
              name="title"
              placeholder="e.g. Spring 2026 Registration Fee"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-description">Description (optional)</Label>
            <Input
              id="payment-description"
              name="description"
              placeholder="Brief description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-amount">Amount (USD)</Label>
            <Input
              id="payment-amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="50.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Type</Label>
            <Select value={paymentType} onValueChange={(val) => { if (val) setPaymentType(val); }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create Payment Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
