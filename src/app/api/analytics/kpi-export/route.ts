import { auth } from "@clerk/nextjs/server";
import { getCurrentLeadChannelBreakdown, getWeeklyKpiMetrics } from "@/lib/analytics-kpi";
import { getUserOrganizations } from "@/lib/memberships";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // KPI export shows platform-wide metrics — restrict to org owners only
  const orgs = await getUserOrganizations(userId);
  const isOwner = orgs.some((o) => o.role === "owner");
  if (!isOwner) {
    return new Response("Forbidden", { status: 403 });
  }

  const [metrics, channels] = await Promise.all([
    getWeeklyKpiMetrics(),
    getCurrentLeadChannelBreakdown(100),
  ]);

  const lines = [
    "section,metric,current_7d,previous_7d",
    `funnel,landing_cta_clicks,${metrics.current.landingCtaClicks},${metrics.previous.landingCtaClicks}`,
    `funnel,signup_page_views,${metrics.current.signupPageViews},${metrics.previous.signupPageViews}`,
    `funnel,signup_submissions,${metrics.current.signupSubmissions},${metrics.previous.signupSubmissions}`,
    `funnel,org_activations,${metrics.current.orgActivations},${metrics.previous.orgActivations}`,
    `funnel,lead_records,${metrics.current.leadRecords},${metrics.previous.leadRecords}`,
    "",
    "section,source,medium,leads_current_7d",
    ...channels.map((row) => `attribution,${row.source},${row.medium},${row.leads}`),
  ];

  const csv = `${lines.join("\n")}\n`;
  const dateLabel = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="weekly-kpi-${dateLabel}.csv"`,
    },
  });
}
