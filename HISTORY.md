# YSO Connect - Project History

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
