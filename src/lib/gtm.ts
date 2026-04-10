export type FunnelEventName =
  | "funnel_landing_cta_click"
  | "funnel_signup_page_view"
  | "funnel_signup_submitted"
  | "funnel_org_activation";

export interface FunnelEventPayload {
  organizationId?: string;
  organizationSlug?: string;
  location?: string;
  pagePath?: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  referrer?: string | null;
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function getDefaultPayload(): Partial<FunnelEventPayload> {
  if (typeof window === "undefined") {
    return {};
  }

  const params = new URLSearchParams(window.location.search);
  return {
    pagePath: window.location.pathname,
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    utmTerm: params.get("utm_term"),
    utmContent: params.get("utm_content"),
    referrer: document.referrer || null,
  };
}

function pushToDataLayer(eventName: FunnelEventName, payload: FunnelEventPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({
    event: eventName,
    ...payload,
  });
}

function recordFunnelEvent(eventName: FunnelEventName, payload: FunnelEventPayload) {
  if (typeof window === "undefined") {
    return;
  }

  void fetch("/api/analytics/funnel", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      eventName,
      ...payload,
    }),
    keepalive: true,
  }).catch(() => {
    // Intentionally swallow analytics transport errors.
  });
}

export function trackFunnelEvent(
  eventName: FunnelEventName,
  payload: Partial<FunnelEventPayload> = {},
) {
  const mergedPayload: FunnelEventPayload = {
    ...getDefaultPayload(),
    ...payload,
  };

  pushToDataLayer(eventName, mergedPayload);
  recordFunnelEvent(eventName, mergedPayload);
}
