import { NextResponse } from "next/server";
import { db } from "@/db";
import { funnelEvents } from "@/db/schema";

/**
 * Funnel Analytics API
 * 
 * NOTE ON AUTH: This endpoint is intentionally EXEMPT from Clerk authentication 
 * in src/proxy.ts. This allows us to track conversion events (landing page CTA clicks, 
 * signup flow steps) for anonymous users who do not yet have a session.
 * 
 * To prevent abuse:
 * - Event names are restricted to a strictly defined ALLOWED_EVENTS allowlist.
 * - All input strings are sanitized and length-limited.
 */
const ALLOWED_EVENTS = new Set([
  "funnel_landing_cta_click",
  "funnel_signup_page_view",
  "funnel_signup_submitted",
  "funnel_org_activation",
  "funnel_billing_page_view",
  "funnel_checkout_initiated",
  "funnel_checkout_completed",
]);

const MAX_FIELD_LENGTH = 512;

function sanitizeValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_FIELD_LENGTH) {
    return null;
  }
  return trimmed;
}

export async function POST(request: Request) {
  // Intentionally public endpoint: funnel events are posted from public pages
  // and pre-auth flows where a Clerk session may not exist yet.
  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventName = sanitizeValue(payload.eventName);
  if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
    return NextResponse.json({ error: "Invalid event name" }, { status: 400 });
  }

  await db.insert(funnelEvents).values({
    eventName,
    organizationId: sanitizeValue(payload.organizationId),
    organizationSlug: sanitizeValue(payload.organizationSlug),
    location: sanitizeValue(payload.location),
    pagePath: sanitizeValue(payload.pagePath),
    utmSource: sanitizeValue(payload.utmSource),
    utmMedium: sanitizeValue(payload.utmMedium),
    utmCampaign: sanitizeValue(payload.utmCampaign),
    utmTerm: sanitizeValue(payload.utmTerm),
    utmContent: sanitizeValue(payload.utmContent),
    referrer: sanitizeValue(payload.referrer),
  });

  return NextResponse.json({ ok: true });
}
