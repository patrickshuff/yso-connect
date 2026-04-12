# JAR-191 Evidence Bundle (2026-04-11)

Issue: [JAR-191](/JAR/issues/JAR-191)
Validation lane: [JAR-189](/JAR/issues/JAR-189)
Parent: [JAR-186](/JAR/issues/JAR-186)

All checks below were run on `2026-04-11` UTC against production (`https://www.ysoconnect.com`).

## 1. Cron route accessibility with valid `CRON_SECRET` bearer auth

Command:

```bash
set -a; source /tmp/jar191-prod.env; set +a
APP_URL="${NEXT_PUBLIC_APP_URL//\\n/}"
CRON_SECRET_CLEAN="${CRON_SECRET//\\n/}"
curl -sS -o /tmp/jar191-cron-auth-body.txt -D /tmp/jar191-cron-auth-headers.txt \
  -H "Authorization: Bearer $CRON_SECRET_CLEAN" \
  "$APP_URL/api/cron/trial-reminders" \
  -w "http_status=%{http_code}\\n"
```

Observed:

- Timestamp: `2026-04-11T04:58:07Z`
- Status: `HTTP/2 200`
- Response snippet: `{"runId":"ff52bc15-e547-40ad-9a83-73402577e3b2","status":"completed","found":0,"processed":0,"failed":0,"durationMs":114}`

## 2. Signed-out redirect attribution (`redirect_url` + `utm_*` preservation)

Command:

```bash
set -a; source /tmp/jar191-prod.env; set +a
APP_URL="${NEXT_PUBLIC_APP_URL//\\n/}"
curl -sS -I \
  "$APP_URL/dashboard?utm_source=jar191&utm_medium=qa&utm_campaign=guardrail"
```

Observed:

- Timestamp: `2026-04-11T04:58:19Z`
- Status: `HTTP/2 307`
- `Location` header:
  `/sign-in?redirect_url=%2Fdashboard%3Futm_source%3Djar191%26utm_medium%3Dqa%26utm_campaign%3Dguardrail&utm_source=jar191&utm_medium=qa&utm_campaign=guardrail`

Result: redirect preserves both full encoded `redirect_url` and top-level `utm_*` params.

## 3. Production `stripe_webhook` telemetry slug integrity

Command:

```bash
set -a; source /tmp/jar191-prod.env; set +a
DATABASE_URL_CLEAN="${DATABASE_URL//\\n/}"
node <<'NODE'
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL_CLEAN, { ssl: 'require' });
(async () => {
  const [summary] = await sql`
    select
      count(*)::int as total_rows,
      count(*) filter (where organization_slug is null or btrim(organization_slug) = '')::int as null_or_empty_slug_rows,
      count(*) filter (where organization_slug like 'unknown-org-%')::int as fallback_slug_rows,
      max(created_at) as latest_row_at
    from funnel_events
    where location = 'stripe_webhook'
  `;
  console.log(summary);
  await sql.end({ timeout: 5 });
})();
NODE
```

Observed summary:

- `total_rows=1`
- `null_or_empty_slug_rows=0`
- `fallback_slug_rows=0`
- `latest_row_at=2026-04-11T03:02:49.576Z`

Recent sample row:

- `event_name=checkout_completed`
- `organization_id=dc00607c-cbe9-46ad-b853-1e91b801d0b6`
- `organization_slug=jcyso`
- `created_at=2026-04-11T03:02:49.576Z`

## 4. Fallback behavior evidence when slug lookup misses

Production currently has no fallback rows (`unknown-org-*` count = `0`).
Fallback path validation evidence comes from regression test coverage:

Command:

```bash
yarn vitest run src/app/api/webhooks/stripe/route.test.ts \
  --testNamePattern "fallback organizationSlug" --reporter=verbose
```

Observed:

- `✓ uses non-null fallback organizationSlug for webhook telemetry when org slug lookup is missing`
- Test result: `1 passed | 2 skipped`

This confirms fallback slug emission and warning log behavior for missing-org-slug lookup cases.

## Residual risks

- Current production data volume for `location='stripe_webhook'` is low (`1` row), so ongoing monitoring should keep the `null_or_empty_slug_rows` query in routine guardrail checks.
- Fallback path has test evidence but no production occurrence yet; continue alerting on warning log: `Billing webhook telemetry missing organization slug; using fallback`.
