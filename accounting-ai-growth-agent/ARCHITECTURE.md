# Architecture

## Why Postiz, and how this system uses it

[gitroomhq/postiz-app](https://github.com/gitroomhq/postiz-app) is an
open-source, self-hosted, AGPL-3.0 social media scheduling tool. It already
solves the hard, credential-heavy part of this problem: OAuth against
LinkedIn/X/Facebook/Instagram/TikTok/etc., token storage/refresh, media
upload, provider-specific post settings, and a scheduler/queue backed by
Temporal. Re-implementing that would be most of the effort and all of the
risk (breaking OAuth against 5 platforms is easy, keeping it working is the
actual hard part — that's why Postiz exists as a maintained project).

So **Postiz is the social publishing engine**. This repo,
`accounting-ai-growth-agent`, is a separate service that owns everything
upstream of "publish": research, scoring, verification, writing,
media-card generation, safety, and scheduling — then hands a finished,
approved post to Postiz's public API to actually go out.

```
ACCOUNTING AI KNOWLEDGE (knowledge/*.md)
        │
        ▼
RESEARCH ENGINE (RSS/HTML source registry, tiered by authority)
        │
        ▼
TOPIC SCORING (freshness/authority/relevance/novelty → composite score)
        │
        ▼
FACT VERIFICATION (Claim Ledger: VERIFIED/PARTIALLY_VERIFIED/UNVERIFIED/CONFLICTING)
        │
        ▼
CONTENT STRATEGIST (one TopicBrief per topic)
        │
        ▼
PLATFORM WRITERS (LinkedIn/X/Facebook/Instagram/TikTok — separate drafts)
        │
        ▼
MEDIA GENERATOR (SVG→PNG branded cards, IG/TikTok only)
        │
        ▼
SAFETY GATE (hard blocklist + claim status + duplicate check + LLM risk read)
        │
        ▼
SCHEDULER (weekly calendar, per-platform frequency, spread within a publishing window)
        │
        ▼
POSTIZ PUBLIC API (PostizClient — the only module that talks to Postiz)
        │
        ▼
LinkedIn / X / Facebook / Instagram / TikTok
```

This split means Postiz can be upgraded, redeployed, or have its OAuth apps
reconfigured without touching this codebase — only `PostizClient` and the
env vars in `.env.example` need to change if its public API shape changes.

## What was verified about Postiz (2026-08, via GitHub — docs.postiz.com
itself was unreachable from this environment's network egress, so this is
based on the postiz-app README, the postiz-docs repo's public-api pages,
and its `openapi.json`)

- **Stack**: NextJS frontend + NestJS backend, Prisma/PostgreSQL, Redis,
  Temporal for workflow/scheduling, monorepo.
- **Self-hosting**: `ghcr.io/gitroomhq/postiz-app:latest` image, plus its own
  Postgres, Redis, and a full Temporal stack (temporal server, its own
  Postgres, Elasticsearch, Temporal UI). This is a non-trivial compose file
  — see SETUP.md for why we don't reimplement it here.
- **OAuth model**: users authenticate directly with each platform through
  Postiz; Postiz never asks this service (or us) for platform credentials —
  it only needs *its own* developer-app credentials per platform (see
  SOCIAL_SETUP.md) and stores the resulting tokens itself.
- **Public API** (`/public/v1` on the instance's backend URL):
  - `GET /integrations` — connected channels, each with `id`, `identifier`
    (e.g. `linkedin`, `x`, `facebook`, `instagram`, `tiktok`), `disabled`.
  - `POST /upload` — multipart file upload, returns `{id, name, path}`.
  - `POST /posts` — create/schedule a post:
    `{type: "schedule"|"draft"|"now", date, posts: [{integration:{id}, value:[{content, image:[{id}]}], settings:{...}}]}`.
  - `GET /posts?startDate&endDate` — list posts in a range.
  - `GET /integration-settings/{id}` — per-integration max length, settings
    schema, available "tools".
  - Auth: `Authorization: <api-key>` header (personal key or `pos_...`
    OAuth2 token).
  - Rate limit: ~90 create-post calls/hour self-hosted (100 cloud).
- **Provider settings shape** varies per platform (`__type` discriminator),
  e.g. TikTok takes `privacy_level`, `duet`, `stitch`, `comment`,
  `video_made_with_ai`; LinkedIn takes `post_as_images_carousel`; Instagram
  takes `post_type`, `collaborators`; Reddit takes a `subreddit` array. This
  service currently sends a minimal `{__type: platform}` settings object —
  extend `publishPipeline.ts`'s `postInput.settings` per platform as you
  wire up real accounts and want carousel/privacy controls.

`src/postiz/postizClient.ts` implements exactly this surface, with a
`POSTIZ_MOCK` mode (auto-enabled whenever no API key is configured) so the
whole pipeline runs and is testable without a live Postiz instance.

## Why this stack (TypeScript/Node/Postgres/Prisma, no Redis/Kafka/K8s)

The brief explicitly asked for the simplest thing that's reliable, run as a
single worker with Postiz's own scheduler doing the heavy lifting on the
publishing side. There's no need for a message queue here: the only
"queue" this service manages is a content calendar in Postgres, and the
only "worker coordination" problem is not running two cron ticks at once,
which a single `SystemSetting` row with a TTL solves (`pipeline/lock.ts`).
Adding Redis/Kafka/K8s would be solving a scaling problem this project
doesn't have.

## Module map

| Path | Responsibility |
|---|---|
| `src/config.ts` | All env-driven configuration, one place |
| `src/llm/` | Provider-agnostic LLM abstraction (anthropic/openai/mock) |
| `src/knowledge/` | Loads `knowledge/*.md` fresh on every access (mtime-checked) |
| `src/research/` | Source registry, RSS/HTML fetchers, content-hash dedup |
| `src/scoring/` | 0-100 topic scoring |
| `src/verification/` | Claim Ledger / fact verification |
| `src/content/` | Content Strategist (TopicBrief), duplicate detection |
| `src/content/writers/` | Per-platform writers |
| `src/media/` | SVG→PNG branded card generator |
| `src/safety/` | Hard blocklist + Safety Gate |
| `src/postiz/` | The only module allowed to call Postiz |
| `src/scheduler/` | Weekly calendar builder |
| `src/pipeline/` | Orchestration: run log, locking, pause state, the 3 pipeline stages |
| `src/api/` | Express HTTP API + serves the static panel |
| `src/panel/public/` | Single-page vanilla-JS ops dashboard |
| `src/cron/` | Autonomous periodic loop |

## Data flow through Prisma models

`ResearchItem` → (scored, deduped) → `Topic` → `Claim`/`SourceEvidence`
(fact-checking) → `ContentDraft` (+ `MediaAsset`, `Approval`) →
`ScheduledContent` → `PublishedContent`. Every pipeline invocation is
recorded as an `AgentRun` with an ordered stage log (brief #23).
