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
  playerId?: string;
  playerName?: string;
}

const RELATIONSHIPS = [
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "guardian", label: "Guardian" },
  { value: "grandparent", label: "Grandparent" },
  { value: "other", label: "Other" },
] as const;

export function AddGuardianDialog({
  orgId,
  playerId,
  playerName,
}: AddGuardianDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const phone = (formData.get("phone") as string | null)?.trim();
    const email = (formData.get("email") as string | null)?.trim();
    if (!phone && !email) {
      setError("Phone or email is required");
      return;
    }
    setPending(true);
    if (playerId) formData.set("playerId", playerId);
    const result = await createGuardian(orgId, formData);
    setPending(false);
    if (result.success) {
      setOpen(false);
    } else {
      setError(result.error ?? "Failed to add guardian");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Plus className="size-3.5" data-icon="inline-start" />
        Add Guardian
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {playerName ? `Add Guardian for ${playerName}` : "Add Guardian"}
          </DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="guardian-first">First Name</Label>
              <Input id="guardian-first" name="firstName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guardian-last">Last Name</Label>
              <Input id="guardian-last" name="lastName" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardian-relationship">Relationship</Label>
            <select
              id="guardian-relationship"
              name="relationship"
              defaultValue="guardian"
              className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {RELATIONSHIPS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardian-phone">Phone</Label>
            <Input
              id="guardian-phone"
              name="phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardian-email">Email</Label>
            <Input
              id="guardian-email"
              name="email"
              type="email"
              placeholder="parent@example.com"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Add Guardian"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
