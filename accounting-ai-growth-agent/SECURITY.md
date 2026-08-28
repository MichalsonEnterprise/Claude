# Security

## Secrets

- Never commit `.env` — it's gitignored. Only `.env.example` (no real
  values) is tracked.
- Secrets handled by this service: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
  `POSTIZ_API_KEY`, `DATABASE_URL` (contains a password), `PANEL_TOKEN`.
- This service never sees social-platform OAuth tokens — those live only
  inside Postiz (see `ARCHITECTURE.md`/`SOCIAL_SETUP.md`).
- `git log --all -- '*.env'` and a manual diff review were run before
  finishing this task; no secret values were committed at any point in
  this branch's history.

## Logging

`src/logger.ts` redacts any object key matching
`/(api[_-]?key|token|secret|password|authorization)/i` before it reaches
stdout, recursively, including nested objects and arrays. This covers the
common accidental-leak paths (logging a config object, an HTTP header
object, a Postiz request payload that happens to include an
`Authorization` field). It does **not** scan free-text log messages for
secret-shaped strings — don't interpolate a raw API key into a log
message string; log it as `{ apiKey }` in the `data` object instead so the
redactor catches it.

## Hard blocklist as a security control, not just a content-quality one

`src/safety/blocklist.ts` includes a rule (`secret-leak`) that blocks any
generated post matching an `api_key:`/`secret:`/`password:` pattern, and a
`personal-data-pesel` rule for an 11-digit number adjacent to the word
"PESEL". These exist because an LLM occasionally echoes back something
strange from context; the blocklist is the deterministic backstop, not
the only line of defense — the knowledge base itself should never contain
real secrets or real third-party personal data in the first place.

## Postiz API key scope

Use a Postiz API key scoped to what this service actually needs (post
creation, integration listing, media upload). If Postiz's key management
supports narrower scopes than "full account access" by the time you set
this up, prefer the narrower one.

## Network egress

`PostizClient` and the research fetchers are the only code paths that make
outbound HTTP calls. The research fetchers only hit the curated
`SOURCE_REGISTRY` URLs (`src/research/sources.ts`) — this is not a general
crawler, so it doesn't take arbitrary URLs as input at runtime.

## Dependency posture

No exotic or unmaintained dependencies were introduced. `npm audit` may
report advisories in transitive dependencies over time — review and
update rather than ignoring, but this was not gated as part of this task.
