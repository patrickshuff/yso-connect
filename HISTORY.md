# YSO Connect - Project History

## 2026-04-08 - Comprehensive audit and critical bug fixes

### What changed
- **Stripe renewal bug fixed**: Added `subscription_data.metadata` to checkout session so `invoice.paid` and `customer.subscription.updated` webhooks can find the org. Without this, paying customers would be locked out after the first billing cycle.
- **Reminders now actually send notifications**: `processReminder` was a no-op (marked sent but never notified anyone). Now sends SMS/email via the messaging system to team guardians or org-wide guardians.
- **Events auto-create reminders**: Added `createDefaultReminders()` call in the events POST API route. Previously reminders were never created.
- **TCPA consent enforcement**: SMS sends now check `sms_consents` table before sending. Guardians without active consent are skipped with a warning log.
- **Email XSS fixed**: Subject and body are now HTML-escaped before interpolation into email templates.
- **Payment link bug fixed**: Payment items list was generating URLs with orgId (UUID) instead of org slug, causing all payment links to 404.
- **Cancelled events excluded from reminders**: `getUpcomingReminders` now filters `isCancelled = false`.
- **Cron endpoint protected**: Added `CRON_SECRET` bearer auth to `/api/cron/reminders`.
- **Cross-org FK validation**: Teams POST/PATCH validates seasonId/divisionId belong to the org. Events POST/PATCH validates teamId belongs to the org.
- **Join table APIs added**: New routes for linking players to guardians (`POST/DELETE .../players/[playerId]/guardians`) and assigning players to teams (`POST/DELETE .../teams/[teamId]/players`).
- **Seasons dashboard page created**: Sidebar linked to seasons but the page didn't exist.
- **Import Roster button enabled**: Was disabled on dashboard overview, now links to the import page.
- **Settings nav link removed**: Pointed to non-existent page.
- **CRON_SECRET env var set** in Vercel production.
- **`.env.example` updated** with `CRON_SECRET` and `NEXT_PUBLIC_APP_URL`.

### What's still mocked
- SMS/email auto-switch to real mode when Twilio/Resend env vars are set (they are in production)
- Resend domain `noreply@ysoconnect.com` needs verification in Resend dashboard

### Known issues remaining
- No Preview environment vars (preview deployments will fail)
- No form update/delete actions
- Form assignment dropdown shows UUIDs to guardians
- Sequential messaging may timeout for large audiences
- No stripeCustomerId/stripeSubscriptionId stored on org
- Org-tier pricing displayed but no backend
- No tests (zero coverage)
- No edit event UI
- Phone number format not enforced for E.164

---

## 2026-04-08 - Freemium coach billing gate

### What changed
- Added `subscriptionStatusEnum` to `src/db/schema/enums.ts` with values: trial, active, expired, none
- Added three fields to `organizations` table: `trialEndsAt`, `subscriptionStatus`, `subscriptionPaidUntil`
- Created `src/lib/trial.ts` with utility functions: `isTrialActive`, `isSubscriptionActive`, `requireActiveAccess`, `getTrialDaysRemaining`
- Created `src/components/dashboard/billing-gate.tsx` client component that shows trial banner, expired lock screen, or passes through for active subscriptions
- Updated `src/app/dashboard/[orgId]/layout.tsx` to wrap children with BillingGate
- Updated `src/app/dashboard/onboarding/actions.ts` to set `trialEndsAt` (now + 30 days) when creating an org
- Created `src/app/dashboard/[orgId]/billing/page.tsx` and `src/app/dashboard/[orgId]/billing/actions.ts` for billing page with Stripe checkout
- Created `src/components/dashboard/billing-page-content.tsx` client component showing plan status and upgrade CTA
- Updated `src/app/api/webhooks/stripe/route.ts` to handle `coach_billing` checkout completions, updating org subscriptionStatus to active and subscriptionPaidUntil to now + 6 months
- Added "Billing" nav item to `src/components/dashboard/sidebar-nav.tsx`

### Why
Implement freemium model: coaches get 30-day free trial, then $10/6 months to continue using the dashboard. Data is preserved when locked. Org-level subscriptions bypass the gate.
