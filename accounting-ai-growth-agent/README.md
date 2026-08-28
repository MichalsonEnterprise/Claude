# accounting-ai-growth-agent

A private, autonomous marketing agent for **Accounting AI**. It researches
Polish tax/accounting news, scores and fact-checks topics, writes
platform-specific content, generates branded carousel images, runs a
safety gate, schedules a weekly content calendar, and hands finished posts
to [Postiz](https://github.com/gitroomhq/postiz-app) for actual
publication to LinkedIn, X, Facebook, Instagram, and TikTok.

This is **not** a SaaS product — it's a single-operator internal tool.
See `MASTER_TASK` context in the repo history / `FINAL_STATUS.md` for the
full brief this was built against.

## Quick start

```bash
cp .env.example .env        # edit as needed — defaults are safe (DRY_RUN=true, mock AI, mock Postiz)
npm install
npx prisma migrate deploy   # or `migrate dev` on first run
npm run seed                # registers the research source registry
npm run dry-run:week        # full pipeline, DRY_RUN, writes artifacts/sample-week/
npm run dev                 # start the API + panel + cron loop
```

Open `http://localhost:8090/` for the panel, `http://localhost:8090/health`
for a liveness check.

See **SETUP.md** for the full deployment guide (including running Postiz
alongside this), **SOCIAL_SETUP.md** for per-platform OAuth app setup,
**AUTOPILOT.md** for the OFF/DRAFT/FULL_AUTO modes, **CONTENT_POLICY.md**
for what this agent will and will not publish, **SECURITY.md** for the
secrets/logging posture, and **ARCHITECTURE.md** for how it's built and
why Postiz was chosen as the publishing engine.

## Repository layout

```
accounting-ai-growth-agent/
  knowledge/          # Markdown knowledge base the agent is grounded in
  prisma/schema.prisma
  src/                # TypeScript source (see ARCHITECTURE.md module map)
  scripts/            # seed.ts, generate-week.ts (dry-run sample generator)
  tests/               # vitest unit tests
  artifacts/sample-week/  # output of the dry-run demo (generated, see below)
  docker-compose.yml  # this service + its own Postgres (NOT Postiz)
```

## Status

See `FINAL_STATUS.md` for exactly what's working, what's tested, what
needs your credentials, and what's not finished.
