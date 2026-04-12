"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateGuardian,
  removeGuardianFromPlayer,
} from "@/app/dashboard/[orgId]/guardians/actions";

interface EditGuardianDialogProps {
  orgId: string;
  guardianId: string;
  playerGuardianId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  relationship: string;
}

const RELATIONSHIPS = [
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "guardian", label: "Guardian" },
  { value: "grandparent", label: "Grandparent" },
  { value: "other", label: "Other" },
] as const;

export function EditGuardianDialog({
  orgId,
  guardianId,
  playerGuardianId,
  firstName,
  lastName,
  phone,
  email,
  relationship,
}: EditGuardianDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState(false);

  const displayName = `${firstName} ${lastName}`;
  const displayRel = relationship !== "guardian" ? relationshipLabel(relationship) : null;

  async function handleSubmit(formData: FormData) {
    setError(null);
    const p = (formData.get("phone") as string | null)?.trim();
    const e = (formData.get("email") as string | null)?.trim();
    if (!p && !e) {
      setError("Phone or email is required");
      return;
    }
    setPending(true);
    formData.set("playerGuardianId", playerGuardianId);
    const result = await updateGuardian(orgId, guardianId, formData);
    setPending(false);
    if (result.success) {
      setOpen(false);
    } else {
      setError(result.error ?? "Failed to save");
    }
  }

  async function handleRemove() {
    if (!confirm("Remove this guardian from the player?")) return;
    setRemoving(true);
    const result = await removeGuardianFromPlayer(orgId, playerGuardianId);
    setRemoving(false);
    if (result.success) {
      setOpen(false);
    } else {
      setError(result.error ?? "Failed to remove");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Badge
            variant="secondary"
            className="cursor-pointer font-normal hover:bg-secondary/80"
          />
        }
      >
        {displayName}
        {displayRel ? ` — ${displayRel}` : ""}
        {phone ? ` · ${phone}` : ""}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Guardian</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-first">First Name</Label>
              <Input id="edit-first" name="firstName" defaultValue={firstName} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-last">Last Name</Label>
              <Input id="edit-last" name="lastName" defaultValue={lastName} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-relationship">Relationship</Label>
            <select
              id="edit-relationship"
              name="relationship"
              defaultValue={relationship}
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
            <Label htmlFor="edit-phone">Phone</Label>
            <Input
              id="edit-phone"
              name="phone"
              type="tel"
              defaultValue={phone ?? ""}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              name="email"
              type="email"
              defaultValue={email ?? ""}
              placeholder="parent@example.com"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleRemove}
              disabled={removing || pending}
              className="text-destructive hover:text-destructive"
            >
              {removing ? "Removing…" : "Remove"}
            </Button>
            <Button type="submit" disabled={pending || removing}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function relationshipLabel(r: string): string {
  switch (r) {
    case "mother": return "Mother";
    case "father": return "Father";
    case "grandparent": return "Grandparent";
    case "other": return "Other";
    default: return "Guardian";
  }
}
