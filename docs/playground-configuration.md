# PMP Playground — configuration and deployment

Everything Playground needs beyond the application code. None of it is required
to run the feature in development; all of it is required before a client uses it.

> `.env.production.example` is matched by `.env*` in `.gitignore`, so it is not
> in version control. This file is the tracked copy of what belongs there.

---

## Environment

### PAX AI (optional)

With no key set, PAX AI runs on a deterministic placeholder provider: the dock
works, nothing is billed, and every response says plainly that it is not a real
suggestion. Nothing breaks; the feature simply does not generate.

```sh
# gemini (default) | mock | off
PLAYGROUND_AI_PROVIDER=gemini

# Server-side only. Never NEXT_PUBLIC_*.
GEMINI_API_KEY=

# gemini-2.0-flash has been SHUT DOWN by Google. Verify against live docs before
# changing this — the model list moves faster than this file.
GEMINI_MODEL=gemini-3.6-flash

# Durable monthly ceiling, counted in Postgres from PlaygroundAiRun so it
# survives deploys. The in-memory rate limits cannot do this job: they reset on
# every restart and are per-process.
AI_MONTHLY_CALL_CAP=5000
```

### Live video

Not built. `src/lib/playground/video/provider.ts` is a seam with a null
implementation and the meeting controls render visibly disabled. If LiveKit is
added later, its credentials are server-side only — never `NEXT_PUBLIC_*`.

---

## nginx — required before the first live session

Already committed in `docker/nginx/`. Listed here because **every failure mode is
invisible in development**: `next dev` has no nginx, and `docker-compose.yml`
publishes the app on `:3000`, which bypasses the proxy entirely. A localhost
smoke test will look perfect and prove nothing.

- **`limit_req_zone ... zone=playground:10m rate=120r/s`** in `nginx.conf`.
  The shared `api` zone is 30r/s with a 50-slot burst, keyed on client IP. Six
  people in one PMP office each send a batched canvas/presence request every
  ~100ms — about 60r/s combined — which fills that bucket in roughly 1.2 seconds
  and then **503s everything under `/api/` from that address**, including
  NextAuth and the EventSource reconnect itself.

- **`location /api/playground/`** in `conf.d/default.conf`, with
  `proxy_buffering off`, `gzip off`, `proxy_read_timeout 900s` and
  `proxy_set_header Connection ""`. Without buffering off, SSE frames sit in
  nginx's buffer and the room looks frozen. nginx picks the longest prefix
  match, so this wins over `location /api/` regardless of block order.

### Acceptance test

Not optional, and not satisfiable locally:

> Six tabs from one source IP, ten minutes, through https on 443 via
> `docker compose up`. Zero 503s in `docker/nginx/logs`.

---

## Database

One additive migration: `prisma/migrations/20260814000000_add_playground`.
15 tables, 10 enums, no changes to any existing column.

**Before deploying, run `npx prisma migrate status` against production.** The
development database was found carrying an orphan `20260809000000_baseline`
migration that has never existed in git, and was missing the `Lead` table
entirely — which would mean the leads pipeline is broken in production too. If
production shows the same divergence it needs the same repair: create the
missing objects, delete the orphan row, then `migrate resolve --applied` the
historical migrations.

---

## Single-instance invariant

The realtime bus (`src/lib/playground/bus.ts`) is a per-process module
singleton, the same shape and limitation as `rateLimit()` in
`src/lib/security.ts`.

**At two app containers there are two buses, each seeing only its own
subscribers, with no error** — just silently missing presence and live updates.
`docker-compose.yml` defines one app service with no replicas, so this holds
today. Scaling horizontally requires moving `publish`/`subscribe` to Postgres
`LISTEN/NOTIFY`, which is not dependency-free: Prisma 5 exposes no
async-notification callback, so it needs `pg` on a dedicated connection.

---

## Checks

```sh
npm run lint:rtl   # physical CSS properties in Playground components
npm test           # security boundary, op pipeline, camera and payload freezing
npx tsc --noEmit
npm run lint
npm run build
```

`lint:rtl` exists because PMP ships Arabic and Hebrew, and a physical property
(`ml-4`, `text-left`) silently breaks two of three locales in a way nobody
reviewing the PR in English will notice.

### Still unverified — needs real hardware

- 500 nodes at 55fps on a mid-range Android
- Two-finger pinch on a real iPad
- A screen-reader pass (VoiceOver / NVDA) over the room outline and live region
- Native review of the Arabic and Hebrew copy
