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
