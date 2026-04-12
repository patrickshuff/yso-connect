"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function OrgDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to your observability pipeline; console.error is intentional here
    // (Next.js error boundaries run client-side where structured logging isn't available)
    console.error("[OrgDashboardError]", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-sm font-medium text-destructive">
        Something went wrong loading this page.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground">
          Error ID: {error.digest}
        </p>
      )}
      <Button variant="outline" size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
