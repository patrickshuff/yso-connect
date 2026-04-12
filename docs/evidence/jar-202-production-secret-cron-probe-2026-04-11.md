# JAR-202 Production Cron Probe Evidence

Generated at: `2026-04-11T05:55:40Z` (UTC)

Issue: [JAR-202](/JAR/issues/JAR-202)

## Probe

Endpoint:

`GET https://www.ysoconnect.com/api/cron/trial-reminders`

Auth:

`Authorization: Bearer $CRON_SECRET` (production secret; sanitized before use)

Command shape:

```bash
curl -sS \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.ysoconnect.com/api/cron/trial-reminders"
```

## Result

- `http_status=200`
- `location=` (empty; no redirect)
- Response snippet:

```json
{"runId":"1c40534a-90bd-4591-8f26-2ea4877e1ae1","status":"completed","found":0,"processed":0,"failed":0,"durationMs":78}
```

## Notes

- A prior scripted run returned `307` because pulled env values contained trailing/literal newline artifacts.
- Re-running the probe with sanitized `APP_URL` and `CRON_SECRET` produced the expected `HTTP 200`.
