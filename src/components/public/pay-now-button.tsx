"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createPublicCheckoutSession } from "@/app/o/[slug]/pay/[itemId]/actions";

interface PayNowButtonProps {
  slug: string;
  itemId: string;
}

export function PayNowButton({ slug, itemId }: PayNowButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);

    const result = await createPublicCheckoutSession(slug, itemId);

    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      setError(result.error ?? "Something went wrong");
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        size="lg"
        className="w-full"
        onClick={handleClick}
        disabled={pending}
      >
        {pending ? "Redirecting to checkout..." : "Pay Now"}
      </Button>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
