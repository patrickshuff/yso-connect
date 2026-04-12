#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import postgres from "postgres";

const ISSUE_ID = "JAR-199";
const VALIDATION_ISSUE_ID = "JAR-186";
const PARENT_ISSUE_ID = "JAR-197";
const OUT_DEFAULT_DIR = "docs/evidence";
const RAW_ARGS = process.argv.slice(2);
const DRY_RUN = RAW_ARGS.includes("--dry-run");
const ISSUE_REF = readArg("--issue") ?? ISSUE_ID;
const OUT_PATH =
  readArg("--out") ??
  `${OUT_DEFAULT_DIR}/${ISSUE_REF.toLowerCase()}-telemetry-guardrail-evidence-${dateStamp()}.md`;

const APP_URL = sanitizeEnv(process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL);
const CRON_SECRET = sanitizeEnv(process.env.CRON_SECRET);
const DATABASE_URL = sanitizeEnv(process.env.DATABASE_URL);
const PROTECTED_PATH =
  process.env.GUARDRAIL_PROTECTED_PATH ??
  "/dashboard?utm_source=guardrail&utm_medium=qa&utm_campaign=trial_reminder";

const checks = [];

const cronCommand = [
  "curl -sS -o /tmp/trial-reminder-cron-body.txt -D /tmp/trial-reminder-cron-headers.txt \\",
  '  -H "Authorization: Bearer $CRON_SECRET" \\',
  '  "$APP_URL/api/cron/trial-reminders" \\',
  '  -w "http_status=%{http_code}\\n"',
].join("\n");

const redirectCommand = [
  "curl -sS -I \\",
  `  "$APP_URL${PROTECTED_PATH}"`,
].join("\n");

const slugCommand = [
  "# SQL scaffold (execute with psql or your DB client):",
  "select",
  "  count(*)::int as total_rows,",
  "  count(*) filter (where organization_slug is null or btrim(organization_slug) = '')::int as null_or_empty_slug_rows,",
  "  count(*) filter (where organization_slug like 'unknown-org-%')::int as fallback_slug_rows,",
  "  max(created_at) as latest_row_at",
  "from funnel_events",
  "where location = 'stripe_webhook';",
].join("\n");

await runChecks();
await writeBundle();

const hasFailures = checks.some((check) => check.status === "FAIL");
if (hasFailures && !DRY_RUN) {
  process.exit(1);
}

async function runChecks() {
  checks.push(await runCronCheck());
  checks.push(await runRedirectCheck());
  checks.push(await runWebhookSlugCheck());
}

async function runCronCheck() {
  const now = new Date().toISOString();
  if (DRY_RUN) {
    return {
      key: "cron",
      title: "Cron route accessibility probe",
      status: "SKIP",
      observedAt: now,
      command: cronCommand,
      details:
        "Dry-run mode: network probe skipped. Run without --dry-run and with APP_URL + CRON_SECRET to execute.",
    };
  }

  if (!APP_URL || !CRON_SECRET) {
    return {
      key: "cron",
      title: "Cron route accessibility probe",
      status: "FAIL",
      observedAt: now,
      command: cronCommand,
      details:
        "Missing required env vars. Set APP_URL (or NEXT_PUBLIC_APP_URL) and CRON_SECRET.",
    };
  }

  const url = `${APP_URL}/api/cron/trial-reminders`;
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
      redirect: "manual",
    });
    const body = (await response.text()).replace(/\s+/g, " ").trim().slice(0, 600);
    return {
      key: "cron",
      title: "Cron route accessibility probe",
      status: response.ok ? "PASS" : "FAIL",
      observedAt: now,
      command: cronCommand,
      details: `Status: HTTP ${response.status}\nResponse snippet: ${body || "<empty>"}`,
    };
  } catch (error) {
    return {
      key: "cron",
      title: "Cron route accessibility probe",
      status: "FAIL",
      observedAt: now,
      command: cronCommand,
      details: `Request failed: ${toErrorMessage(error)}`,
    };
  }
}

async function runRedirectCheck() {
  const now = new Date().toISOString();
  if (DRY_RUN) {
    return {
      key: "redirect",
      title: "Redirect URL + UTM preservation verification",
      status: "SKIP",
      observedAt: now,
      command: redirectCommand,
      details:
        "Dry-run mode: redirect probe skipped. Run without --dry-run to validate status + Location header.",
    };
  }

  if (!APP_URL) {
    return {
      key: "redirect",
      title: "Redirect URL + UTM preservation verification",
      status: "FAIL",
      observedAt: now,
      command: redirectCommand,
      details: "Missing APP_URL (or NEXT_PUBLIC_APP_URL).",
    };
  }

  const url = `${APP_URL}${PROTECTED_PATH}`;
  try {
    const response = await fetch(url, { redirect: "manual" });
    const location = response.headers.get("location") ?? "<missing>";
    const hasRedirectParam = location.includes("redirect_url=");
    const hasUtmSource = location.includes("utm_source=");
    const hasUtmMedium = location.includes("utm_medium=");
    const statusLooksRight = response.status === 302 || response.status === 307;
    const pass = statusLooksRight && hasRedirectParam && hasUtmSource && hasUtmMedium;

    return {
      key: "redirect",
      title: "Redirect URL + UTM preservation verification",
      status: pass ? "PASS" : "FAIL",
      observedAt: now,
      command: redirectCommand,
      details: [
        `Status: HTTP ${response.status}`,
        `Location: ${location}`,
        `Checks: status_302_or_307=${statusLooksRight}, redirect_url=${hasRedirectParam}, utm_source=${hasUtmSource}, utm_medium=${hasUtmMedium}`,
      ].join("\n"),
    };
  } catch (error) {
    return {
      key: "redirect",
      title: "Redirect URL + UTM preservation verification",
      status: "FAIL",
      observedAt: now,
      command: redirectCommand,
      details: `Request failed: ${toErrorMessage(error)}`,
    };
  }
}

async function runWebhookSlugCheck() {
  const now = new Date().toISOString();
  if (DRY_RUN) {
    return {
      key: "webhook-slug",
      title: "Webhook telemetry organization_slug integrity query",
      status: "SKIP",
      observedAt: now,
      command: slugCommand,
      details:
        "Dry-run mode: database query skipped. SQL scaffold is included below for production execution.",
    };
  }

  if (!DATABASE_URL) {
    return {
      key: "webhook-slug",
      title: "Webhook telemetry organization_slug integrity query",
      status: "SKIP",
      observedAt: now,
      command: slugCommand,
      details:
        "DATABASE_URL not set. Skipping live query; use SQL scaffold for manual execution.",
    };
  }

  const sql = postgres(DATABASE_URL, { ssl: inferSslMode(DATABASE_URL) });
  try {
    const [summary] = await sql`
      select
        count(*)::int as total_rows,
        count(*) filter (where organization_slug is null or btrim(organization_slug) = '')::int as null_or_empty_slug_rows,
        count(*) filter (where organization_slug like 'unknown-org-%')::int as fallback_slug_rows,
        max(created_at) as latest_row_at
      from funnel_events
      where location = 'stripe_webhook'
    `;

    const [latestRow] = await sql`
      select
        event_name,
        organization_id,
        organization_slug,
        created_at
      from funnel_events
      where location = 'stripe_webhook'
      order by created_at desc
      limit 1
    `;

    const pass = Number(summary?.null_or_empty_slug_rows ?? 1) === 0;

    return {
      key: "webhook-slug",
      title: "Webhook telemetry organization_slug integrity query",
      status: pass ? "PASS" : "FAIL",
      observedAt: now,
      command: slugCommand,
      details: [
        `Summary: total_rows=${summary?.total_rows ?? 0}, null_or_empty_slug_rows=${summary?.null_or_empty_slug_rows ?? 0}, fallback_slug_rows=${summary?.fallback_slug_rows ?? 0}, latest_row_at=${summary?.latest_row_at ?? "null"}`,
        latestRow
          ? `Latest row: event_name=${latestRow.event_name}, organization_id=${latestRow.organization_id}, organization_slug=${latestRow.organization_slug}, created_at=${latestRow.created_at}`
          : "Latest row: <none>",
      ].join("\n"),
    };
  } catch (error) {
    return {
      key: "webhook-slug",
      title: "Webhook telemetry organization_slug integrity query",
      status: "FAIL",
      observedAt: now,
      command: slugCommand,
      details: `Query failed: ${toErrorMessage(error)}`,
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function writeBundle() {
  const absoluteOutPath = path.resolve(process.cwd(), OUT_PATH);
  await mkdir(path.dirname(absoluteOutPath), { recursive: true });

  const summaryRows = checks
    .map(
      (check) =>
        `| ${check.title} | ${check.status} | ${check.observedAt} |`,
    )
    .join("\n");

  const sectionBody = checks
    .map((check, index) =>
      [
        `## ${index + 1}. ${check.title}`,
        "",
        `- Status: **${check.status}**`,
        `- Observed at: \`${check.observedAt}\``,
        "",
        "Command:",
        "",
        "```bash",
        check.command,
        "```",
        "",
        "Observed:",
        "",
        "```text",
        check.details,
        "```",
      ].join("\n"),
    )
    .join("\n\n");

  const markdown = [
    `# ${ISSUE_REF} Trial Reminder Guardrail Evidence Bundle`,
    "",
    `Generated at: \`${new Date().toISOString()}\``,
    `Mode: \`${DRY_RUN ? "dry-run" : "live"}\``,
    "",
    `Issue: [${ISSUE_REF}](/JAR/issues/${ISSUE_REF})`,
    `Validation lane: [${VALIDATION_ISSUE_ID}](/JAR/issues/${VALIDATION_ISSUE_ID})`,
    `Parent: [${PARENT_ISSUE_ID}](/JAR/issues/${PARENT_ISSUE_ID})`,
    "",
    "## Summary",
    "",
    "| Check | Status | Timestamp (UTC) |",
    "| --- | --- | --- |",
    summaryRows,
    "",
    sectionBody,
    "",
    "## Closure note",
    "",
    `This bundle is generated by \`yarn telemetry:guardrails:evidence\` and is formatted for direct paste into [${VALIDATION_ISSUE_ID}](/JAR/issues/${VALIDATION_ISSUE_ID}) closure comments.`,
  ].join("\n");

  await writeFile(absoluteOutPath, markdown, "utf8");
  console.log(`Wrote evidence bundle: ${absoluteOutPath}`);

  const failed = checks.filter((check) => check.status === "FAIL").length;
  const skipped = checks.filter((check) => check.status === "SKIP").length;
  const passed = checks.filter((check) => check.status === "PASS").length;
  console.log(`Summary: pass=${passed} fail=${failed} skip=${skipped}`);
}

function readArg(flag) {
  const index = RAW_ARGS.indexOf(flag);
  if (index === -1) return null;
  return RAW_ARGS[index + 1] ?? null;
}

function sanitizeEnv(value) {
  if (!value) return "";
  return value.replace(/\n/g, "").trim();
}

function inferSslMode(databaseUrl) {
  return /(localhost|127\.0\.0\.1)/i.test(databaseUrl) ? false : "require";
}

function toErrorMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}
