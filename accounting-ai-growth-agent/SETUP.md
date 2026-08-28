# Setup / Deployment Guide

## Overview

Two independent services, two independent databases:

1. **Postiz** — the social publishing engine. Deployed from its own,
   official docker-compose (see below). We deliberately do not fork or
   embed it.
2. **accounting-ai-growth-agent** (this repo) — research/content/scheduling
   brain. Talks to Postiz only through its public API.

## 1. Run Postiz

Follow Postiz's own instructions — they change independently of this repo,
so always check the current ones rather than trusting anything cached here:

- Repo: https://github.com/gitroomhq/postiz-app
- Docs: https://docs.postiz.com (introduction / installation / docker)

As of this writing, self-hosting Postiz means running its
`ghcr.io/gitroomhq/postiz-app` image plus its own Postgres, Redis, and a
full Temporal stack (server + Postgres + Elasticsearch + UI) — see
`ARCHITECTURE.md` for what was verified about this. Clone
`gitroomhq/postiz-app`, copy its `.env.example` to `.env`, fill in
`JWT_SECRET`, `DATABASE_URL`, `FRONTEND_URL` /
`NEXT_PUBLIC_BACKEND_URL` / `BACKEND_INTERNAL_URL`, and whichever social
platform OAuth app credentials you've created (see `SOCIAL_SETUP.md`),
then `docker compose up -d` from *their* repo.

Once it's running, log into its web UI, connect each social account you
want to post to (LinkedIn, X, Facebook, Instagram, TikTok), and generate a
personal API key (or OAuth token) from its settings — that's your
`POSTIZ_API_KEY`.

## 2. Configure accounting-ai-growth-agent

```bash
cd accounting-ai-growth-agent
cp .env.example .env
```

Fill in at minimum:

- `DATABASE_URL` — this service's own Postgres (separate from Postiz's).
- `POSTIZ_BASE_URL` — e.g. `http://<postiz-host>:4007/public/v1` for a
  self-hosted instance, or `https://api.postiz.com/public/v1` for cloud.
- `POSTIZ_API_KEY` — from step 1. Leave blank (or `POSTIZ_MOCK=true`) to
  run the whole pipeline against a mock Postiz that never makes network
  calls — useful for development and for `npm run dry-run:week`.
- `AI_PROVIDER` — `anthropic`, `openai`, or `mock`. Leave `mock` until you
  have an API key; the whole pipeline runs end-to-end on the mock provider.
- `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` — whichever provider you chose.
- Leave `AUTOPILOT_MODE=DRAFT` and `DRY_RUN=true` until you've reviewed a
  few generated weeks by hand. See `AUTOPILOT.md`.

## 3. Run it

### With Docker (recommended for the always-on deployment)

```bash
docker compose up -d --build
```

This starts this service's own Postgres and the growth-agent container,
which runs `prisma migrate deploy` on boot, then starts the API/panel/cron
loop. It does **not** start Postiz — point `POSTIZ_BASE_URL` at wherever
you deployed that separately (same Docker host, another host, or Postiz
Cloud).

### Without Docker (local development)

```bash
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

## 4. Verify

```bash
curl http://localhost:8090/health
curl http://localhost:8090/status
```

`/status` reports whether the DB, AI provider, and Postiz are connected or
running in mock mode.

## 5. Generate a sample week (no real publishing, no real credentials needed)

```bash
npm run dry-run:week
```

Writes readable Markdown + PNG carousel slides to `artifacts/sample-week/`
for every platform, plus `SUMMARY.json`. Safe to run at any time — it
forces `DRY_RUN=true` regardless of your `.env`.

## 6. Turning on real publishing

Once you've reviewed generated content and are ready to actually publish:

1. Set `DRY_RUN=false`.
2. Keep `AUTOPILOT_MODE=DRAFT` at first — content still requires approval
   via the panel's APPROVE button (or `POST /drafts/:id/approve`) before it
   is sent to Postiz.
3. Once you trust the pipeline, switch to `AUTOPILOT_MODE=FULL_AUTO` —
   only drafts that pass the Safety Gate with verdict `ALLOW` publish
   autonomously (see `AUTOPILOT.md`, `CONTENT_POLICY.md`).

## Required environment variables reference

See `.env.example` — every variable is documented there.
