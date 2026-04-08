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
import { assignForm } from "@/app/dashboard/[orgId]/forms/actions";

interface AssignFormDialogProps {
  orgId: string;
  formId: string;
  teams: { id: string; name: string }[];
  players: { id: string; firstName: string; lastName: string }[];
}

export function AssignFormDialog({
  orgId,
  formId,
  teams,
  players,
}: AssignFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [assignmentType, setAssignmentType] = useState<string>("organization");
  const [targetId, setTargetId] = useState<string>("");

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    formData.set("assignmentType", assignmentType);
    if (assignmentType !== "organization" && targetId) {
      formData.set("assignmentTargetId", targetId);
    }

    const result = await assignForm(orgId, formId, formData);

    setPending(false);
    if (result.success) {
      setOpen(false);
      setAssignmentType("organization");
      setTargetId("");
    } else {
      setError(result.error ?? "Failed to assign form");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Plus className="size-4" data-icon="inline-start" />
        Assign Form
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Form</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Assign To</Label>
            <Select
              value={assignmentType}
              onValueChange={(val) => {
                if (val) setAssignmentType(val);
                setTargetId("");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="organization">Entire Organization</SelectItem>
                <SelectItem value="team">Specific Team</SelectItem>
                <SelectItem value="player">Specific Player</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {assignmentType === "team" && (
            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={targetId} onValueChange={(val) => { if (val) setTargetId(val); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {assignmentType === "player" && (
            <div className="space-y-2">
              <Label>Player</Label>
              <Select value={targetId} onValueChange={(val) => { if (val) setTargetId(val); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a player" />
                </SelectTrigger>
                <SelectContent>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.firstName} {p.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="assign-due-date">Due Date (optional)</Label>
            <Input id="assign-due-date" name="dueDate" type="date" />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
