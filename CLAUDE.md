# YSO Connect

Multi-tenant youth sports organization platform.

## Stack
- Next.js 16 (App Router, src directory)
- TypeScript strict mode
- Tailwind CSS v4 + shadcn/ui
- Drizzle ORM + Postgres
- Clerk for auth
- Vercel for deployment (team: jarobe)

## Conventions
- Use yarn (not npm)
- UUIDs for all database IDs
- Path alias: @/* -> ./src/*
- shadcn components in src/components/ui/
- Custom components in src/components/
- Database schema in src/db/schema/
- API routes in src/app/api/
- No `any` types
- No next/script usage
- Structured logging only (no console.log in production code)
- OpenTelemetry instrumentation via @vercel/otel

## Auth
- Clerk handles identity/sessions
- Our DB handles org membership, roles, relationships
- Passwordless: SMS OTP primary, email magic link secondary

## Database
- Drizzle ORM with postgres driver
- Run migrations: `npx drizzle-kit push`
- Generate migrations: `npx drizzle-kit generate`

## Discord Monitoring
- Patrick's Discord channel must be checked every 5 minutes during active sessions
- Use the discord fetch_messages tool to poll for new messages
- If any messages are addressed to the bot (@bot), respond immediately
- Do not let messages sit unread for more than 5 minutes
