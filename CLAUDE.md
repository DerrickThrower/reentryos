# CLAUDE.md

Orientation for Claude Code sessions working in this repo. Every claim below was verified against the code as of the initial hackathon-era commits; correct this file if the code moves on.

## 1. What this is

ReEntryOS is a Next.js web app that helps **reentry case workers** coordinate the critical first 72 hours after a client is released from incarceration. A case worker fills in an intake form; a server-side "agent pipeline" then searches for real local resources (shelters, benefits offices, clinics, employers, food banks, DMV), computes a risk score, has an LLM synthesize a structured 72-hour service plan, books Google Calendar appointments, and sends/schedules Twilio SMS check-ins to the client. The case worker reviews everything in a dashboard. Built for a hackathon (originally on Gemini — see §9), demo-quality in places.

## 2. Domain context

- **Users are case workers, not clients.** The dashboard, intake form, and approval flow are for staff. Clients only interact via SMS (reminders, `HELP`/`RIDE` keywords).
- **Client data is sensitive PII about formerly incarcerated people**: names, phone numbers, release dates, medical conditions (including mental health), prior charges. Treat it accordingly — don't log it, don't paste real records into commits/PRs/issues, don't loosen the RLS policies or the `.gitignore` rules for `.env*`.
- Compliance posture (HIPAA etc.): TODO: confirm — nothing in the repo addresses it. Assume the strictest interpretation when handling data.
- There is currently **no real authorization**: the login page has a "Demo mode — skip login" link straight to `/dashboard`, and all API routes use the Supabase service-role key with no auth check. Do not treat any route as protected.

## 3. Tech stack

(Versions from `package-lock.json`.)

- **Next.js 14.2.35** (App Router, `app/` directory) + **React 18.3.1**, **TypeScript 5.9.3** (`strict: true`), path alias `@/*` → repo root
- **Tailwind CSS 3.4.19** + Radix UI primitives + `lucide-react` icons; dark, monospace "terminal" aesthetic
- **Supabase** (`@supabase/supabase-js` 2.106.2) — Postgres datastore; service-role client on the server, anon client in the browser (auth only)
- **LLM: OpenAI Agents SDK (`@openai/agents` 0.13.5)** — Plan Agent on `gpt-4o` with a Tavily search tool (`lib/plan-agent.ts`), SMS Triage Agent on `gpt-4o-mini` (`lib/sms-triage-agent.ts`); zod schemas as structured `outputType`
- **Tavily** search API via raw `fetch` (real-world resource lookup; also exposed to both agents as a tool)
- **Twilio 5.13.1** — outbound SMS, scheduled SMS (Messaging Service), inbound webhook
- **googleapis 140.0.1** — Google Calendar v3 via OAuth2 refresh token
- **zod 4.4.3** — agent output schemas + plan normalization (v4 required by `@openai/agents`)
- Hosting: `.gitignore` mentions `.vercel`, so Vercel is the likely target. TODO: confirm.
- No test framework, no CI, no Prettier config. `npm run lint` (`next lint` / eslint-config-next) is the only check.

## 4. Commands

```bash
npm install                  # install deps
cp .env.example .env.local   # then fill in keys (see §7)
npm run dev                  # dev server on http://localhost:3000
npm run build                # production build (good smoke test — catches type errors)
npm run start                # serve production build
npm run lint                 # next lint

# Demo/E2E: with `npm run dev` running, seed a mock client ("Marcus Thompson")
npx ts-node -r dotenv/config --project tsconfig.json scripts/seed.ts
```

There are no unit tests. `scratch/` holds ad-hoc test scripts from development (some target Gemini and are dead code).

Database setup is manual: paste `migrations/001_initial_schema.sql` into the Supabase SQL editor. There is no migration tool.

## 5. Architecture & data flow

The pipeline is a hard-coded orchestration in `app/api/intake/stream/route.ts` (POST handler, SSE response, `maxDuration = 300`). Each named stage emits progress events via `AgentEmitter` (`lib/agents.ts`), which both streams SSE to the browser and inserts rows into `agent_logs`. Two stages are **real LLM agents built on the OpenAI Agents SDK** (tool loop, structured output): the Plan Agent and the inbound SMS Triage Agent. Everything else is deliberately deterministic TypeScript — risk scoring, benefits analysis, and housing ranking are policy/safety decisions kept out of the LLM (keyword matching, regex extraction of addresses/phones from search snippets).

```
Case worker (browser)
  intake form / dashboard "regenerate"
        │ POST JSON
        ▼
/api/intake/stream  ──SSE──▶  AgentFeed.tsx (live log UI)
  │
  ├─ Orchestrator: insert/update `clients` row
  ├─ Search Agent: lib/tavily.ts — 6 parallel Tavily queries
  │     (housing, benefits, clinics, employers, food banks, DMV)
  ├─ Benefits Agent: deterministic TS (analyzeBenefits)
  ├─ Housing Agent: deterministic TS (rankHousing)
  ├─ Risk Agent: deterministic TS (calculateRisk) → update `clients`
  ├─ Plan Agent: lib/plan-agent.ts generateServicePlan()
  │     → Agents SDK on gpt-4o: baseline search results in prompt,
  │       search_local_resources tool for follow-ups (maxTurns 8),
  │       strict zod outputType, normalized + defaulted, 1 retry
  │     → tool calls stream into AgentFeed via onToolEvent hook
  │     → insert `service_plans` + `tasks`
  ├─ Calendar Agent: lib/google-calendar.ts createEvent() ×3
  │     (Medicaid, DMV, 72h check-in) → insert `appointments`
  ├─ SMS Agent: lib/twilio.ts — sendSMS() now + scheduleSMS() ×4
  │     follow-ups → insert `sms_log` (direction='outbound')
  └─ Documentation Agent: final `clients` risk update

Client's phone ──inbound SMS──▶ Twilio ──POST form-encoded──▶ /api/sms/webhook
  ├─ validate X-Twilio-Signature (403 on mismatch; skipped only when
  │     TWILIO_AUTH_TOKEN is unset, i.e. simulated mode)
  ├─ look up client by phone_number, log to `sms_log` (direction='inbound')
  ├─ body contains "HELP" → flag message, force client risk to critical/95,
  │     auto-reply "caseworker notified"  ← deterministic safety net, runs FIRST
  ├─ body contains "RIDE" → live Tavily search for local transport, auto-reply
  ├─ anything else (known client) → lib/sms-triage-agent.ts on gpt-4o-mini:
  │     classifies urgency (→ flag + escalate risk) and may draft a ≤160-char
  │     reply grounded in a Tavily tool call; returns null on ANY failure and
  │     the webhook degrades to log-only (pre-agent behavior)
  └─ respond with TwiML (usually empty <Response/>)
```

Other API routes (all thin Supabase CRUD, service-role client):
- `GET /api/clients` — list with joined plans/appointments/sms, sorted by risk
- `GET /api/clients/[id]` — full client detail (plans, appointments, sms, logs, tasks)
- `PATCH /api/clients/[id]/approve` — set latest plan's `worker_approved = true`
- `POST /api/appointments/create` — manual appointment: Calendar event + DB row + confirmation SMS
- `POST /api/sms/send` — manual outbound SMS from the dashboard's Messages tab

The dashboard (`app/dashboard/page.tsx`) fetches these routes; it does **not** use Supabase realtime subscriptions (the migration adds tables to the realtime publication, but no client code subscribes — UI updates come from refetching).

External-service degradation: `sendSMS`/`scheduleSMS` return `"SMS_SIMULATED*"` and `createEvent` returns `CALENDAR_PENDING` when their env vars are missing, so the pipeline runs end-to-end without Twilio/Google configured. Tavily failures return empty arrays. The Plan Agent, by contrast, **throws** without `OPENAI_API_KEY`.

## 6. Data model

Schema: `migrations/001_initial_schema.sql`; matching TS types: `types/index.ts`. All tables are UUID-keyed; every child table has `client_id` FK → `clients` with `on delete cascade`.

- **clients** — name, release_date, city/state, has_id, housing_status (`none|temporary|stable`), medical_conditions, prior_charges, phone_number, risk_score (0–100), risk_level (`critical|warning|stable`)
- **service_plans** — `plan_json` (jsonb, shape = `ServicePlanJSON` in types: urgent_needs, housing_options, benefits_eligibility, id_recovery, nearby_resources, appointments, second_chance_employers, sms_messages, caseworker_notes), `worker_approved` flag
- **appointments** — title/location/address, scheduled_time, calendar_event_id/link, sms_sent
- **sms_log** — direction (`inbound|outbound`), body, twilio_sid, scheduled_at, `flagged` (set when inbound body contains HELP; drives the dashboard's unread/alert state)
- **tasks** — derived from the plan's urgent_needs (category, action, priority, deadline text, completed)
- **agent_logs** — pipeline telemetry (agent_name, status `working|done|error`, message, duration_ms)

RLS is enabled on all tables, but policies just grant `authenticated` full access — and the server always uses the service-role key, which bypasses RLS anyway.

## 7. Configuration / secrets

`.env.example` is the canonical list; copy to `.env.local` (all `.env*` files are gitignored — never commit keys).

| Var | Used by |
|---|---|
| `OPENAI_API_KEY` | `lib/plan-agent.ts` + `lib/sms-triage-agent.ts` (read implicitly by the Agents SDK). **Required** for plan generation; without it SMS triage silently no-ops. |
| `TAVILY_API_KEY` | `lib/tavily.ts` (baseline searches + both agents' search tool), `app/api/sms/webhook/route.ts` (RIDE lookup) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser client (`lib/supabase.ts`, login page) |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase-server.ts` — all API routes. High privilege; server-only. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | `lib/twilio.ts` sendSMS |
| `TWILIO_MESSAGING_SERVICE_SID` | scheduled SMS (Twilio enforces send-at ≥ ~15 min out; code clamps to now+16 min) |
| `TWILIO_WEBHOOK_URL` | optional: pins the exact public URL used for webhook signature validation; otherwise reconstructed from `x-forwarded-proto`/`x-forwarded-host` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | `lib/google-calendar.ts` OAuth2 |
| `GOOGLE_CALENDAR_TIMEZONE` | event timezone (default `America/Los_Angeles`) |

Not in `.env.example` but referenced: `GEMINI_API_KEY` (scratch scripts only, dead). README also mentions `GOOGLE_CALENDAR_ID`, but the code hard-codes `calendarId: 'primary'`.

Both agent modules call `setTracingDisabled(true)` at import time so run transcripts (which contain client PII) are never sent to the OpenAI traces dashboard. Do not re-enable tracing.

Twilio inbound requires configuring the phone number's "A message comes in" webhook to `https://<deployed-domain>/api/sms/webhook` (POST) — see README.

## 8. Conventions

- App Router layout: pages in `app/<route>/page.tsx` (all `'use client'`), API routes in `app/api/**/route.ts` with `export const dynamic = 'force-dynamic'`. Shared logic in `lib/`, UI in `components/` (flat, PascalCase files, named exports), all types centralized in `types/index.ts`, no barrel files.
- Import via the `@/` alias, not relative paths.
- Server code imports `supabaseServer` from `lib/supabase-server`; client components import `createBrowserClient` from `lib/supabase`. Keep that split — mixing them previously broke the webpack build (see commit 609501c).
- External-service calls are wrapped in try/catch so the pipeline degrades instead of dying; follow that pattern when adding integrations.
- Styling is inline Tailwind with hard-coded hex colors (`#0a0a0a` backgrounds, `#3b82f6` accent, mono uppercase labels). Match the existing look; there's no design-token system.
- No branch/PR norms are documented and history is single-author with informal messages. TODO: confirm any team conventions.

## 9. Known issues / gotchas

- **Dual zod schemas in `lib/plan-agent.ts` are intentional.** The agent's `outputType` schema must stay strict-mode compatible (every field required-or-`.nullable()`; no `.optional()`, `.default()`, or min/max constraints — structured outputs reject them). Defaults, clamping, and 160-char SMS truncation are applied afterward by `normalizePlan` via the lenient schema, so stored `plan_json` keeps the pre-migration shape. Edit both schemas together.
- The webhook now `await`s a `gpt-4o-mini` run (maxTurns 4) before returning TwiML; Twilio times out webhooks around 15s, so keep triage fast and never add heavier models or more turns there without moving it out of the request path. Triage failure of any kind returns `null` and degrades to log-only.
- **README is stale** on `GOOGLE_CALENDAR_ID` and contains a `file:///Users/derrickthrower/...` local link. Provider-churn remnants (Gemini-era scripts) survive only in `scratch/`, which is excluded from `tsconfig.json` and not compiled.
- **Auth is demo-only**: skip-login link, no session checks on any API route, service-role key everywhere. Any real deployment needs an auth layer before all `app/api` routes.
- **`HardcodedTimeline.tsx` is fake demo UI** — a static, hard-coded 72-hour timeline rendered on the dashboard's PLAN tab alongside the real `PlanView`. Don't mistake it for data-driven code.
- Address/phone extraction from Tavily snippets is regex-based (`/\d+...(St|Ave|Blvd...)/`) and best-effort; expect junk values. The LLM prompt mitigates with `verified: false` flags.
- `calculateRisk` always adds +10 "no income source" for every client; SMS bodies are truncated at 160 chars; HELP keyword forcibly sets risk_score to 95 — all intentional demo heuristics. The HELP keyword path is the deterministic safety net and must keep running before (and regardless of) LLM triage.
- Inbound webhook signature validation is URL-sensitive: Twilio signs the exact public URL it POSTed to, and the route reconstructs it from `x-forwarded-proto`/`x-forwarded-host`. If a proxy/CDN rewrites those headers, set `TWILIO_WEBHOOK_URL` explicitly or every real webhook will 403. With `TWILIO_AUTH_TOKEN` unset (simulated mode) validation is skipped entirely — the webhook is unauthenticated in local demos.
- Scheduled follow-up SMS times are computed from `release_date`/`now` and can drift from the Calendar events' times; the "5 messages scheduled" log message actually schedules 4.
- `scratch/` is dead experimentation code; don't extend it, and don't take it as ground truth.
- Client SMS consent/opt-out (STOP handling beyond Twilio defaults) is unhandled. TODO: confirm intended compliance approach before touching SMS flows.

## 10. Good first tasks if extending

- Add real auth: gate `app/api/**` routes on a Supabase session instead of shipping the service-role key path unauthenticated.
- Notify the case worker when triage marks a message urgent (today it only flags the row, same as HELP).
- Use the Agents SDK's streamed run events for Plan Agent telemetry instead of the coarse `onToolEvent` hook (per-turn model/tool timing into `agent_logs`).
- Replace `HardcodedTimeline` with a timeline rendered from `plan_json.urgent_needs` / `appointments`.
- Use Supabase realtime (already enabled in the migration) to live-update the Messages tab and flagged-SMS alerts instead of refetch-on-click.
- Add a test harness (the deterministic pieces — `calculateRisk`, `analyzeBenefits`, `rankHousing`, `normalizePlan` — are pure functions and easy to unit-test; the first three are unexported, so export them or test via the route).
