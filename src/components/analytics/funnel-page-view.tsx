"use client";

import { useEffect } from "react";
import { trackFunnelEvent } from "@/lib/gtm";

interface FunnelPageViewProps {
  organizationSlug?: string;
  location: string;
}

export function FunnelPageView({ organizationSlug, location }: FunnelPageViewProps) {
  useEffect(() => {
    trackFunnelEvent("funnel_signup_page_view", {
      organizationSlug,
      location,
    });
  }, [location, organizationSlug]);

  return null;
}
