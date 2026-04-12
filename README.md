# YSO Connect

Multi-tenant platform for youth sports organizations. Manages teams, rosters, scheduling, and parent communication.

## Prerequisites

- Node.js 20+
- Yarn
- PostgreSQL

## Getting Started

1. Install dependencies:
   ```bash
   yarn install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Fill in the required values in `.env.local`.

3. Push the database schema:
   ```bash
   npx drizzle-kit push
   ```

4. Start the dev server:
   ```bash
   yarn dev
   ```

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Database:** PostgreSQL via Drizzle ORM
- **Auth:** Clerk (passwordless SMS OTP + email magic link)
- **Payments:** Stripe
- **SMS:** Twilio
- **Email:** Resend
- **Observability:** OpenTelemetry via @vercel/otel
- **Deployment:** Vercel

## Scripts

| Command       | Description              |
| ------------- | ------------------------ |
| `yarn dev`    | Start development server |
| `yarn build`  | Production build         |
| `yarn start`  | Start production server  |
| `yarn lint`   | Run ESLint               |

## Runbooks

- `docs/runbooks/trial-reminder-telemetry-guardrails.md` - Guardrails, alert thresholds, and triage flow for trial reminder attribution telemetry.

## Testing & CI

### Local Tests

- **Unit tests:** `yarn test` (vitest)
- **E2E tests:** `yarn e2e:local` (playwright)
  - Requires `.env.local` with `E2E_PHONE_NUMBER`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `DATABASE_URL`.
  - Automatically starts the dev server if it's not already running.
- **Combined check:** `yarn check` (lint, type-check, unit tests)

### CI Expectations

The CI gate (GitHub Actions) runs:
- **Lint & Type-check**
- **Unit tests**
- **E2E tests** (on pull requests and main branch)
  - PRs require the E2E check to pass for merging.
  - The E2E job runs serially with one worker to avoid OTP delivery collisions.
  - Required secrets in GitHub Actions: `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `E2E_PHONE_NUMBER`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`.
