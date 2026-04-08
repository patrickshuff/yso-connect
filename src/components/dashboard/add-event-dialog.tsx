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
import { Textarea } from "@/components/ui/textarea";
import { createEvent } from "@/app/dashboard/[orgId]/events/actions";

interface Team {
  id: string;
  name: string;
}

interface AddEventDialogProps {
  orgId: string;
  teams: Team[];
}

const EVENT_TYPES = [
  { value: "game", label: "Game" },
  { value: "practice", label: "Practice" },
  { value: "event", label: "Event" },
  { value: "meeting", label: "Meeting" },
] as const;

export function AddEventDialog({ orgId, teams }: AddEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const result = await createEvent(orgId, formData);

    setPending(false);
    if (result.success) {
      setOpen(false);
    } else {
      setError(result.error ?? "Failed to create event");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" data-icon="inline-start" />
        Add Event
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Event</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              name="title"
              placeholder="e.g. Saturday Game vs Eagles"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-type">Type</Label>
            <select
              id="event-type"
              name="eventType"
              required
              className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select type</option>
              {EVENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-team">Team (optional)</Label>
            <select
              id="event-team"
              name="teamId"
              className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All teams</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-location">Location (optional)</Label>
            <Input
              id="event-location"
              name="location"
              placeholder="e.g. Main Field, 123 Sports Ave"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-start">Start</Label>
              <Input
                id="event-start"
                name="startTime"
                type="datetime-local"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-end">End</Label>
              <Input
                id="event-end"
                name="endTime"
                type="datetime-local"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-description">Description (optional)</Label>
            <Textarea
              id="event-description"
              name="description"
              placeholder="Additional details about this event"
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
