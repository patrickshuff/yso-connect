"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cancelEvent } from "@/app/dashboard/[orgId]/events/actions";

interface CancelEventButtonProps {
  orgId: string;
  eventId: string;
}

export function CancelEventButton({ orgId, eventId }: CancelEventButtonProps) {
  const [pending, setPending] = useState(false);

  async function handleCancel() {
    setPending(true);
    await cancelEvent(orgId, eventId);
    setPending(false);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCancel}
      disabled={pending}
      className="text-destructive hover:text-destructive"
    >
      {pending ? "Cancelling..." : "Cancel"}
    </Button>
  );
}
