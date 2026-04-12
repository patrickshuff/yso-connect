# JAR-201 Production CRON_SECRET Verification Evidence (2026-04-11)

Issue: [JAR-201](/JAR/issues/JAR-201)
Validation lane: [JAR-186](/JAR/issues/JAR-186)
Parent: [JAR-10](/JAR/issues/JAR-10)

## Scope

Verify production `CRON_SECRET` is present and rerun cron probes that previously failed due to placeholder auth.

## Production env verification

Source:

```bash
vercel env pull /tmp/jar201-prod.env --environment=production --yes
```

Observed:

- `CRON_SECRET` present: `yes`
- `CRON_SECRET` sanitized length: `66`
- `APP_URL`: `https://www.ysoconnect.com`

## Probe 1 - `/api/cron/reminders`

Command:

```bash
set -a; source /tmp/jar201-prod.env; set +a
APP_URL="${NEXT_PUBLIC_APP_URL//\\n/}"
CRON_SECRET_CLEAN="${CRON_SECRET//\\n/}"
curl -sS -o /tmp/jar201-reminders-body.txt -D /tmp/jar201-reminders-headers.txt \
  -H "Authorization: Bearer $CRON_SECRET_CLEAN" \
  "$APP_URL/api/cron/reminders" \
  -w "http_status=%{http_code}\\n"
```

Observed:

- Timestamp: `2026-04-11T05:50:50Z`
- Status: `http_status=200`
- Header status line: `HTTP/2 200`
- Response snippet: `{"runId":"2a50e0c5-be03-4b82-926c-5e991988a100","status":"completed","found":0,"processed":0,"failed":0,"durationMs":96}`

## Probe 2 - `/api/cron/trial-reminders`

Command:

```bash
set -a; source /tmp/jar201-prod.env; set +a
APP_URL="${NEXT_PUBLIC_APP_URL//\\n/}"
CRON_SECRET_CLEAN="${CRON_SECRET//\\n/}"
curl -sS -o /tmp/jar201-trial-reminders-body.txt -D /tmp/jar201-trial-reminders-headers.txt \
  -H "Authorization: Bearer $CRON_SECRET_CLEAN" \
  "$APP_URL/api/cron/trial-reminders" \
  -w "http_status=%{http_code}\\n"
```

Observed:

- Timestamp: `2026-04-11T05:50:50Z`
- Status: `http_status=200`
- Header status line: `HTTP/2 200`
- Response snippet: `{"runId":"ef3e9863-3ff2-4352-a119-54d45f5fb5d5","status":"completed","found":0,"processed":0,"failed":0,"durationMs":114}`

## Conclusion

- Production `CRON_SECRET` is configured and accepted by cron endpoints.
- Prior `401` condition for cron auth is cleared with production secret.
- Guardrail-live evidence supports closure for [JAR-186](/JAR/issues/JAR-186), with parent visibility in [JAR-10](/JAR/issues/JAR-10).
