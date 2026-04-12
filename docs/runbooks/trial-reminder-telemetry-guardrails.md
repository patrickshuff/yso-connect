# Trial Reminder Telemetry Guardrails

This runbook defines regression guardrails for the trial reminder attribution pipeline.

## Guardrails

1. Cron route accessibility
- Endpoint: `GET /api/cron/trial-reminders`
- Expectation: endpoint is public to middleware (no auth redirect), and returns `200` for valid `CRON_SECRET` bearer auth.
- Regression tests:
  - `src/proxy.test.ts` (`/api/cron/trial-reminders` unauthenticated path is not redirected)
  - `src/app/api/cron/trial-reminders/route.test.ts` (auth + response behavior)

2. Redirect URL and UTM preservation
- Source flow: unauthenticated visits to protected dashboard routes.
- Expectation: middleware redirects to `/sign-in` with:
  - full `redirect_url` containing original path + query string
  - preserved `utm_*` params on the sign-in URL
- Regression tests: `src/proxy.test.ts`

3. Non-null `organizationSlug` on billing webhook telemetry
- Source flow: Stripe billing webhook events that write funnel telemetry.
- Expectation: every telemetry write includes a non-empty `organizationSlug`.
- Enforcement: `logBillingFunnelEvent()` normalizes slug and writes deterministic fallback when lookup is missing.
- Regression tests: `src/app/api/webhooks/stripe/route.test.ts`

## Alert thresholds (production)

1. Trial reminder cron accessibility
- Trigger: `/api/cron/trial-reminders` returns non-2xx for 2 consecutive checks (5-minute cadence).
- Severity: high
- Owner: CTO (engineering)

2. Trial reminder attribution drop
- Trigger: zero trial reminder funnel events for 24h during active campaigns.
- Severity: high
- Owner: CMO (GTM) + CTO

3. Missing slug fallback telemetry
- Trigger: any log line `Billing webhook telemetry missing organization slug; using fallback`.
- Severity: critical (data quality regression)
- Owner: CTO

## Triage and recovery

1. Confirm cron route behavior
- Hit `GET /api/cron/trial-reminders` with `Authorization: Bearer $CRON_SECRET`.
- If not `200`, inspect middleware route exemptions and deployment env vars.

2. Verify redirect attribution path
- Open protected URL with `utm_*` params while signed out.
- Confirm `/sign-in` location includes both `redirect_url` and UTM params.

3. Verify webhook telemetry slug integrity
- Inspect recent `funnel_events` rows where `location = 'stripe_webhook'`.
- Confirm `organization_slug` is populated and investigate any fallback slug values (`unknown-org-*`).

4. Escalation
- Engineering regression: assign to CTO owner immediately.
- GTM impact/regression in campaign attribution: notify CMO and CTO in the same incident thread.

## Automated evidence capture bundle

Use the scripted bundle for heartbeat-friendly closure evidence instead of ad-hoc command copy/paste.

## Scheduled monitoring path

- Workflow: `.github/workflows/trial-reminder-telemetry-guardrails.yml`
- Trigger: every 15 minutes (`*/15 * * * *`) and manual `workflow_dispatch`
- Evidence artifact: `trial-reminder-guardrail-evidence` (markdown bundle)
- Required GitHub Actions secrets:
  - `APP_URL`
  - `CRON_SECRET`
  - `DATABASE_URL` (optional but recommended for live webhook slug query)
- Escalation context is published in the workflow summary each run:
  - Owner: CTO (engineering)
  - Escalation: CMO + CTO if campaign attribution is impacted

## CI/Local verification note

These guardrail assertions run in the normal Vitest workflow (local and CI). Run the focused suite with:

```bash
yarn vitest run \
  src/app/api/cron/trial-reminders/route.test.ts \
  src/proxy.test.ts \
  src/app/api/webhooks/stripe/route.test.ts
```

### Required env vars

- `APP_URL` or `NEXT_PUBLIC_APP_URL` (base URL, e.g. `https://www.ysoconnect.com`)
- `CRON_SECRET` (for cron accessibility probe)
- `DATABASE_URL` (optional but recommended; enables live `organization_slug` integrity query)
- Optional: `GUARDRAIL_PROTECTED_PATH` (defaults to `/dashboard?utm_source=guardrail&utm_medium=qa&utm_campaign=trial_reminder`)

### One-command path

```bash
yarn telemetry:guardrails:evidence -- --issue JAR-199
```

Dry-run (no network/database calls, validates output formatting and scaffolds commands):

```bash
yarn telemetry:guardrails:evidence:dry-run
```

### Output format

- Output file path defaults to:
  `docs/evidence/<issue>-telemetry-guardrail-evidence-YYYY-MM-DD.md`
- Bundle contains:
  - summary table with per-check `PASS`/`FAIL`/`SKIP` and UTC timestamp
  - check sections for:
    - cron route accessibility probe
    - redirect + UTM preservation verification
    - webhook `organization_slug` integrity query scaffold (+ live DB summary when `DATABASE_URL` is set)
  - markdown-ready closure note for [JAR-186](/JAR/issues/JAR-186)
