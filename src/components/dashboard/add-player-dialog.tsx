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
import { createPlayer } from "@/app/dashboard/[orgId]/players/actions";

interface AddPlayerDialogProps {
  orgId: string;
  teamId?: string;
}

export function AddPlayerDialog({ orgId, teamId }: AddPlayerDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const result = await createPlayer(orgId, formData);

    setPending(false);
    if (result.success) {
      setOpen(false);
    } else {
      setError(result.error ?? "Failed to create player");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" data-icon="inline-start" />
        Add Player
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Player</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          {teamId && <input type="hidden" name="teamId" value={teamId} />}
          <div className="space-y-2">
            <Label htmlFor="player-first-name">First Name</Label>
            <Input
              id="player-first-name"
              name="firstName"
              placeholder="First name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="player-last-name">Last Name</Label>
            <Input
              id="player-last-name"
              name="lastName"
              placeholder="Last name"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create Player"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
