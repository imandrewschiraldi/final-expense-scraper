# Agent Accelerator

Lead management system for Veterans/Widows final expense leads. Admins import
and assign leads; agents work their own dedicated pool and never see the
shared pool or each other's leads.

## Stack

- Next.js 16 (App Router) + TypeScript
- PostgreSQL via Supabase, accessed through Prisma 7 with the `pg` driver adapter
- NextAuth (credentials login, JWT sessions, role-based route guards)
- Tailwind CSS, theme matched to Tier 1's script tool (black background, copper/teal/green/gold/red palette, Barlow + Barlow Condensed)
- Deployed on Vercel; weekly auto-assignment runs via Vercel Cron

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the values (see below).

3. Run migrations and seed the first admin account:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

## Environment variables

See `.env.example`. Summary:

- `DATABASE_URL` — Supabase pooled connection (port 6543, `pgbouncer=true`). Used by the app at runtime.
- `DIRECT_URL` — Supabase direct connection (port 5432). Used by Prisma Migrate/CLI.
- `AUTH_SECRET` — NextAuth session secret (`openssl rand -base64 32`).
- `NEXTAUTH_URL` — base URL of the app (`http://localhost:3000` locally).
- `CRON_SECRET` — shared secret Vercel Cron sends as a bearer token to protect `/api/cron/vault-revert` and `/api/cron/recycle-leads`.
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — used once by `npm run db:seed` to create the first admin.
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — sends the agent invite email (see below).

## Supabase setup

1. Create a Supabase project.
2. In Project Settings → Database, copy the "Connection pooling" string (port 6543) into `DATABASE_URL`, and the direct connection string (port 5432) into `DIRECT_URL`.
3. Run `npm run db:migrate` locally once against `DIRECT_URL` to create the schema, or `npm run db:deploy` for a non-interactive apply (used in CI/deploy).

## Deploying to Vercel

1. Import the repo into Vercel.
2. Set all variables from `.env.example` in the Vercel project's Environment Variables.
3. Vercel automatically sends `CRON_SECRET` as a bearer token to cron-triggered requests when the env var is set, matching the check in the cron routes.
4. `vercel.json` schedules the vault-revert and lead-recycle jobs — adjust the cron expressions if your agents are not on US Eastern time.
5. Run `npm run db:deploy` (via a one-off build step or manually) before the first deploy so the schema exists, then `npm run db:seed` once to create the initial admin.

## Agent invites

Admins create agents by name + email only (no password). This sends an email via Resend
with a one-time link to `/invite/[token]` where the agent sets their own password and is
signed in. Invite tokens are stored as a SHA-256 hash and expire after 7 days; the admin's
Agents page shows "Invited (pending)" until accepted and can resend the invite at any time.
`RESEND_FROM_EMAIL` must be a verified sender/domain in your Resend account.

## Training

Admins build a course under `/admin/training`: modules containing video lessons (YouTube,
Vimeo, or Loom links are auto-embedded; anything else falls back to an "Open Video" link),
reorderable with the up/down controls. Agents work through it at `/agent/training` with a
per-module progress bar, mark lessons complete, and move lesson-to-lesson with Next/Prev or
the arrow keys, the same pattern used for lead navigation.

## How leads reach an agent

Leads no longer get auto-assigned. The Vault (`/agent/vault`) is the primary intake: every
agent with vault access can browse and call any vault lead. Marking one `Appointment Booked`
or `Sold` claims it into that agent's own "My Leads" and removes it from the shared pool;
marking it `Contacted`, `No Answer`, or `Not Interested` leaves it shared but writes a
`ContactLogEntry` (who touched it, when, and with what outcome), visible to every agent
viewing that lead, so people aren't spam-calling someone who was already worked.

- **Manual admin assignment** (`/admin/leads/assign`, `lib/assignment.ts`): still available for occasional direct hand-offs — filter the shared pool by state, then either check off specific leads or use "Quick Assign" to grab the oldest N unassigned leads in a state for a given agent. CSV import can also send leads straight to a specific agent instead of the vault.
- **Status lifecycle**: `New → Contacted / No Answer / Not Interested` stay in the active pool and are reworkable. `Appointment Booking` claims a vault lead but is still reworkable. `Sold` is the only terminal status — it archives the lead and locks it from further agent edits.

## Project structure

```
app/admin/        Admin dashboard, lead import, assignment, agent management
app/agent/        Agent dashboard and lead detail/notes
app/api/          Route handlers (admin, agent, notifications, cron, auth)
components/       UI primitives + admin/agent-specific components
lib/              Prisma client, auth config, assignment + CSV import logic
prisma/           Schema, migrations, seed script
```
