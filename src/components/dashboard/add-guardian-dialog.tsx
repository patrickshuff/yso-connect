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
import { createGuardian } from "@/app/dashboard/[orgId]/guardians/actions";

interface AddGuardianDialogProps {
  orgId: string;
}

export function AddGuardianDialog({ orgId }: AddGuardianDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const result = await createGuardian(orgId, formData);

    setPending(false);
    if (result.success) {
      setOpen(false);
    } else {
      setError(result.error ?? "Failed to create guardian");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" data-icon="inline-start" />
        Add Guardian
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Guardian</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guardian-first-name">First Name</Label>
            <Input
              id="guardian-first-name"
              name="firstName"
              placeholder="First name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardian-last-name">Last Name</Label>
            <Input
              id="guardian-last-name"
              name="lastName"
              placeholder="Last name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardian-email">Email (optional)</Label>
            <Input
              id="guardian-email"
              name="email"
              type="email"
              placeholder="guardian@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardian-phone">Phone (optional)</Label>
            <Input
              id="guardian-phone"
              name="phone"
              type="tel"
              placeholder="+1 555-123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardian-preferred-contact">
              Preferred Contact
            </Label>
            <select
              id="guardian-preferred-contact"
              name="preferredContact"
              className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              defaultValue="sms"
            >
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="both">Both</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create Guardian"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
