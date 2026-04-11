import { and, count, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { funnelEvents, interestSubmissions } from "@/db/schema";

interface WindowMetrics {
  landingCtaClicks: number;
  signupPageViews: number;
  signupSubmissions: number;
  orgActivations: number;
  leadRecords: number;
  billingPageViews: number;
  checkoutInitiated: number;
  paymentsCompleted: number;
}

export interface WeeklyKpiMetrics {
  current: WindowMetrics;
  previous: WindowMetrics;
  currentStart: Date;
  previousStart: Date;
  currentEnd: Date;
}

export interface LeadChannelRow {
  source: string;
  medium: string;
  leads: number;
}

function toNumber(value: number | string | bigint | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);
  return 0;
}

function getWindowBounds(referenceDate = new Date()) {
  const currentEnd = new Date(referenceDate);
  const currentStart = new Date(referenceDate);
  currentStart.setDate(currentStart.getDate() - 7);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - 7);

  return { previousStart, currentStart, currentEnd };
}

async function countFunnelEvent(
  eventName: string,
  start: Date,
  end: Date,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(funnelEvents)
    .where(
      and(
        eq(funnelEvents.eventName, eventName),
        gte(funnelEvents.createdAt, start),
        lt(funnelEvents.createdAt, end),
      ),
    );

  return toNumber(row?.value);
}

async function getWindowMetrics(start: Date, end: Date): Promise<WindowMetrics> {
  const [
    landingCtaClicks,
    signupPageViews,
    signupSubmissions,
    orgActivations,
    leadRecords,
    billingPageViews,
    checkoutInitiated,
    paymentsCompleted,
  ] = await Promise.all([
    countFunnelEvent("funnel_landing_cta_click", start, end),
    countFunnelEvent("funnel_signup_page_view", start, end),
    countFunnelEvent("funnel_signup_submitted", start, end),
    countFunnelEvent("funnel_org_activation", start, end),
    (async () => {
      const [row] = await db
        .select({ value: count() })
        .from(interestSubmissions)
        .where(
          and(
            gte(interestSubmissions.createdAt, start),
            lt(interestSubmissions.createdAt, end),
          ),
        );

      return toNumber(row?.value);
    })(),
    countFunnelEvent("funnel_billing_page_view", start, end),
    countFunnelEvent("funnel_checkout_initiated", start, end),
    countFunnelEvent("checkout_completed", start, end),
  ]);

  return {
    landingCtaClicks,
    signupPageViews,
    signupSubmissions,
    orgActivations,
    leadRecords,
    billingPageViews,
    checkoutInitiated,
    paymentsCompleted,
  };
}

export async function getWeeklyKpiMetrics(): Promise<WeeklyKpiMetrics> {
  const { previousStart, currentStart, currentEnd } = getWindowBounds();

  const [previous, current] = await Promise.all([
    getWindowMetrics(previousStart, currentStart),
    getWindowMetrics(currentStart, currentEnd),
  ]);

  return {
    previous,
    current,
    previousStart,
    currentStart,
    currentEnd,
  };
}

export async function getCurrentLeadChannelBreakdown(
  limit = 8,
): Promise<LeadChannelRow[]> {
  const { currentStart } = getWindowBounds();
  const rows = await db
    .select({
      utmSource: interestSubmissions.utmSource,
      utmMedium: interestSubmissions.utmMedium,
    })
    .from(interestSubmissions)
    .where(gte(interestSubmissions.createdAt, currentStart));

  const counts = new Map<string, LeadChannelRow>();
  for (const row of rows) {
    const source = (row.utmSource ?? "direct").trim() || "direct";
    const medium = (row.utmMedium ?? "none").trim() || "none";
    const key = `${source}__${medium}`;
    const current = counts.get(key) ?? { source, medium, leads: 0 };
    current.leads += 1;
    counts.set(key, current);
  }

  return Array.from(counts.values())
    .sort((a, b) => b.leads - a.leads)
    .slice(0, limit);
}
