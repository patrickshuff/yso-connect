"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updatePlayer,
  removePlayerFromTeam,
} from "@/app/dashboard/[orgId]/players/actions";

interface PlayerEditFormProps {
  orgId: string;
  teamId: string;
  playerId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
}

export function PlayerEditForm({
  orgId,
  teamId,
  playerId,
  firstName,
  lastName,
  dateOfBirth,
}: PlayerEditFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    const result = await updatePlayer(orgId, playerId, formData);
    setPending(false);
    if (!result.success) setError(result.error ?? "Failed to save");
  }

  async function handleRemove() {
    if (!confirm("Remove this player from the team? The player record will remain in the org but will no longer be on this team.")) return;
    setRemoving(true);
    const result = await removePlayerFromTeam(orgId, teamId, playerId);
    setRemoving(false);
    if (result.success) {
      router.push(`/dashboard/${orgId}/teams/${teamId}`);
    } else {
      setError(result.error ?? "Failed to remove");
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="player-first">First Name</Label>
          <Input
            id="player-first"
            name="firstName"
            defaultValue={firstName}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="player-last">Last Name</Label>
          <Input
            id="player-last"
            name="lastName"
            defaultValue={lastName}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="player-dob">Date of Birth</Label>
        <Input
          id="player-dob"
          name="dateOfBirth"
          type="date"
          defaultValue={dateOfBirth ?? ""}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handleRemove}
          disabled={removing || pending}
          className="text-destructive hover:text-destructive"
        >
          {removing ? "Removing…" : "Remove from team"}
        </Button>
        <Button type="submit" disabled={pending || removing}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
