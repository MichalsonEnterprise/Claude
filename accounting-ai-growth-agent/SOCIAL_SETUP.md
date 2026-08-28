# Social Account Setup (per platform)

This system never talks OAuth directly — Postiz owns every OAuth flow, per
its compliance model ("Postiz users always authenticate directly with the
social platform... [Postiz] never stores API keys or access tokens [that
you paste in]"). Your job is to create one **developer app** per platform
and give its client id/secret to your Postiz deployment (as env vars, per
its `.env.example` — see `ARCHITECTURE.md` for the variable names verified
from that file: `X_API_KEY`/`X_API_SECRET`, `LINKEDIN_CLIENT_ID`/`SECRET`,
`FACEBOOK_APP_ID`/`SECRET`, `TIKTOK_CLIENT_ID`/`SECRET` (+ a separate
`TIKTOK_BUSINESS_CLIENT_ID`/`SECRET` pair for TikTok Business accounts)).
Then, inside Postiz's own UI, you click "connect" per platform and complete
the OAuth consent screen as yourself.

**Always check each platform's current developer portal before starting —
app review requirements and scopes change without much notice.**

For every platform, the redirect/callback URI Postiz needs registered is:

```
<NEXT_PUBLIC_BACKEND_URL>/integrations/social/<provider>/callback
```

(exact path can shift between Postiz versions — check the redirect URI
Postiz's own "connect" flow shows you when you start it; that's always
correct for the version you're running.)

---

## LinkedIn (personal profile + Company Page)

- Create an app at https://www.linkedin.com/developers/apps.
- Add the **"Sign In with LinkedIn using OpenID Connect"** and
  **"Share on LinkedIn"** (or the current equivalent — LinkedIn renames
  these periodically) products to the app.
- For posting to a **Company Page**, you additionally need the app
  associated with that Page and the "Community Management API" / "Advertising
  API" access LinkedIn currently requires for organizational posting —
  this typically requires a LinkedIn Partner Program application and
  review; budget real lead time for this one.
- Credentials needed by Postiz: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`.
- Scopes: at minimum `openid profile email w_member_social`; add the
  organization scopes LinkedIn currently requires for Company Page posting.
- Requires review: Company Page posting access, yes. Personal profile
  posting via "Share on LinkedIn," generally no for basic scopes.
- Verify connection: in Postiz, connect the account, then Postiz's
  `/integrations` API call (used by `PostizClient.listIntegrations()`)
  should list it with `identifier: "linkedin"` (personal) or
  `"linkedin-page"` (Company Page) and `disabled: false`.

## X (Twitter)

- Create a project + app at https://developer.x.com.
- Enable **OAuth 2.0** with the scopes X currently requires for posting
  (typically includes `tweet.read tweet.write users.read offline.access`).
- Credentials needed by Postiz: `X_API_KEY`, `X_API_SECRET`.
- Requires review: X's access tiers and pricing change frequently — check
  current tier requirements for write access before assuming Free tier is
  sufficient.
- Verify connection: same `/integrations` check, `identifier: "x"`.

## Facebook Page

- Create an app at https://developers.facebook.com/apps.
- Add the **Facebook Login** and **Pages API** products.
- You need a Facebook **Page** (not a personal profile) to post to — the
  app must be granted `pages_manage_posts`, `pages_read_engagement`, and
  related scopes.
- Credentials needed by Postiz: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`.
- Requires review: yes — Meta App Review is required before these scopes
  work for anyone other than the app's own testers/admins. Budget real
  lead time; Meta review can take days to weeks and sometimes multiple
  rounds.
- Verify connection: `/integrations`, `identifier: "facebook"`.

## Instagram

- Instagram posting goes through the same Meta developer app as Facebook
  (Instagram must be a **Business or Creator account linked to a Facebook
  Page**).
- Add the **Instagram Graph API** product to the same app.
- Scopes needed typically include `instagram_basic`,
  `instagram_content_publish`, `pages_show_list`.
- Requires review: yes, same Meta App Review process as Facebook — often
  bundled into the same review submission.
- Verify connection: `/integrations`, `identifier: "instagram"` (or
  `"instagram-standalone"` depending on the connection type Postiz used).

## TikTok

- Create an app at https://developers.tiktok.com.
- Apply for the **Content Posting API** (or the current equivalent product
  name — TikTok has renamed/restructured this).
- Credentials needed by Postiz: `TIKTOK_CLIENT_ID`, `TIKTOK_CLIENT_SECRET`
  (standard), or `TIKTOK_BUSINESS_CLIENT_ID`/`TIKTOK_BUSINESS_CLIENT_SECRET`
  if posting from a TikTok **Business** account.
- Requires review: yes — direct posting access requires TikTok's app
  review, and unaudited apps are typically limited to posting as
  private/draft until approved.
- Verify connection: `/integrations`, `identifier: "tiktok"`.

---

## What this repo needs from you once accounts are connected

Nothing beyond `POSTIZ_API_KEY` and `POSTIZ_BASE_URL` in `.env` — this
service never sees platform OAuth tokens, only Postiz's own API key. Set
`ENABLED_PLATFORMS` in `.env` to match whichever platforms you've actually
connected in Postiz, so the scheduler and Safety Gate don't plan content
for a platform with no live integration.

## Current status (fill in as you connect accounts)

| Platform | Postiz identifier | Connected? | Notes |
|---|---|---|---|
| LinkedIn (personal) | `linkedin` | ☐ | |
| LinkedIn Company Page | `linkedin-page` | ☐ | requires Partner review |
| X | `x` | ☐ | check current API tier |
| Facebook Page | `facebook` | ☐ | requires Meta App Review |
| Instagram | `instagram` | ☐ | requires Meta App Review, linked to FB Page |
| TikTok | `tiktok` | ☐ | requires Content Posting API approval |
