"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sendMessageAction } from "@/app/dashboard/[orgId]/messages/actions";

interface Team {
  id: string;
  name: string;
}

interface ComposeMessageFormProps {
  orgId: string;
  teams: Team[];
  recipientCounts: {
    organization: number;
    teams: Record<string, number>;
  };
}

export function ComposeMessageForm({
  orgId,
  teams,
  recipientCounts,
}: ComposeMessageFormProps) {
  const router = useRouter();
  const [targetType, setTargetType] = useState<"organization" | "team">("organization");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [channel, setChannel] = useState<"sms" | "email" | "both">("both");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const recipientCount =
    targetType === "organization"
      ? recipientCounts.organization
      : recipientCounts.teams[selectedTeamId] ?? 0;

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setSuccessMessage(null);

    const result = await sendMessageAction(orgId, formData);

    setPending(false);

    if (result.success) {
      setSuccessMessage(
        `Message sent to ${result.recipientCount} recipient(s) with ${result.deliveryCount} delivery(ies).`,
      );
      setTimeout(() => {
        router.push(`/dashboard/${orgId}/messages`);
      }, 1500);
    } else {
      setError(result.error ?? "Failed to send message");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compose Message</CardTitle>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Target selector */}
          <div className="space-y-2">
            <Label htmlFor="targetType">Send to</Label>
            <select
              id="targetType"
              name="targetType"
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as "organization" | "team")}
              className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="organization">Entire Organization</option>
              <option value="team">Specific Team</option>
            </select>
          </div>

          {/* Team selector (conditional) */}
          {targetType === "team" && (
            <div className="space-y-2">
              <Label htmlFor="targetId">Team</Label>
              <select
                id="targetId"
                name="targetId"
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                required
                className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select a team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Channel selector */}
          <div className="space-y-2">
            <Label htmlFor="channel">Channel</Label>
            <select
              id="channel"
              name="channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as "sms" | "email" | "both")}
              className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="both">SMS + Email</option>
              <option value="sms">SMS Only</option>
              <option value="email">Email Only</option>
            </select>
          </div>

          {/* Subject (for email) */}
          {(channel === "email" || channel === "both") && (
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                name="subject"
                placeholder="Message subject..."
              />
            </div>
          )}

          {/* Message body */}
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              name="body"
              placeholder="Type your message here..."
              required
              rows={6}
            />
          </div>

          {/* Recipient count preview */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-muted-foreground dark:border-zinc-800 dark:bg-zinc-900">
            This message will be sent to{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              {recipientCount} guardian(s)
            </span>
            .
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {successMessage && (
            <p className="text-sm text-green-600 dark:text-green-400">
              {successMessage}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/dashboard/${orgId}/messages`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Sending..." : "Send Message"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
