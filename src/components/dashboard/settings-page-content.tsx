"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateReminderSettings } from "@/app/dashboard/[orgId]/settings/actions";

interface SettingsPageContentProps {
  orgId: string;
  reminders24hEnabled: boolean;
  reminders2hEnabled: boolean;
}

export function SettingsPageContent({
  orgId,
  reminders24hEnabled: initialReminders24h,
  reminders2hEnabled: initialReminders2h,
}: SettingsPageContentProps) {
  const [reminders24h, setReminders24h] = useState(initialReminders24h);
  const [reminders2h, setReminders2h] = useState(initialReminders2h);
  const [isPending, startTransition] = useTransition();

  function handleToggle(
    field: "24h" | "2h",
    checked: boolean,
  ) {
    const next24h = field === "24h" ? checked : reminders24h;
    const next2h = field === "2h" ? checked : reminders2h;

    if (field === "24h") setReminders24h(checked);
    if (field === "2h") setReminders2h(checked);

    startTransition(async () => {
      const result = await updateReminderSettings(orgId, next24h, next2h);
      if (!result.success) {
        // Revert on failure
        if (field === "24h") setReminders24h(!checked);
        if (field === "2h") setReminders2h(!checked);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your organization preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Control which automated event reminders are sent to guardians and players.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reminders-24h" className="text-sm font-medium">
                Day-before reminders
              </Label>
              <p className="text-sm text-muted-foreground">
                Send a reminder 24 hours before each event.
              </p>
            </div>
            <Switch
              id="reminders-24h"
              checked={reminders24h}
              onCheckedChange={(checked) => handleToggle("24h", checked)}
              disabled={isPending}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reminders-2h" className="text-sm font-medium">
                Day-of reminders
              </Label>
              <p className="text-sm text-muted-foreground">
                Send a reminder 2 hours before each event.
              </p>
            </div>
            <Switch
              id="reminders-2h"
              checked={reminders2h}
              onCheckedChange={(checked) => handleToggle("2h", checked)}
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
