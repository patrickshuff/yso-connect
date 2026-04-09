"use client";

import { useTransition } from "react";
import { updateSubmissionStatus } from "@/app/dashboard/[orgId]/submissions/actions";
import { Button } from "@/components/ui/button";

type SubmissionStatus = "new" | "contacted" | "enrolled" | "declined";

interface SubmissionStatusButtonProps {
  submissionId: string;
  orgId: string;
  targetStatus: SubmissionStatus;
  label: string;
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost";
}

export function SubmissionStatusButton({
  submissionId,
  orgId,
  targetStatus,
  label,
  variant = "outline",
}: SubmissionStatusButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await updateSubmissionStatus(submissionId, targetStatus, orgId);
    });
  }

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? "Updating..." : label}
    </Button>
  );
}
