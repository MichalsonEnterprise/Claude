# PAGE: /app — Dashboard UX Microcopy

**SEO TITLE:**
VENT App — Your Ecosystem Dashboard

**META DESCRIPTION:**
Your VENT dashboard: balance, locks, rewards, membership, Reputation, research, watchlists, governance, and submissions in one place.

**SUGGESTED H1:**
*(App shell — H1 is the signed-in greeting, see below)*

**OPENGRAPH HEADLINE:**
The VENT App — the ecosystem, signed in.

---

## GLOBAL APP SHELL

**Greeting header:** Good {morning/afternoon/evening}, {first name}.
**Sub-line:** {Membership tier} · Reputation {score} · [tier icon]

**Sidebar labels:**
Dashboard · Research · Watchlist · Governance · Reputation · VENT & Lock · Rewards · Submissions · Settings

**Global states:**
- Loading (any panel): skeleton animation, no text
- Panel error: "This panel couldn't load. [Retry]"
- Offline: "You're offline. Data shown may be out of date."
- Session expiry: "Your session expired. Sign in again to continue." — [Sign In]

---

## MODULE — VENT BALANCE

**Card title:** VENT balance
**Primary value:** {n} VENT
**Rows:** Available {n} · Locked {n} · Pending rewards {n}
**Actions:** Lock VENT · View History →
**Tooltip (Available):** "VENT you can lock, spend on services, or transfer."
**Empty state:** "No VENT in this account yet. Acquire VENT in the distribution or transfer it to your verified wallet." — [View the Distribution →]
**Error:** "Balance couldn't refresh. Showing last synced value ({time})."

## MODULE — LOCKED VENT

**Card title:** VENT Lock
**Row template:** {n} VENT · {90/180/365}-day lock · unlocks {date} · rewards accrued {n} VENT
**Tooltip (rewards accrued):** "Ecosystem rewards from the fixed rewards pool. Not interest or yield; parameters may be adjusted as published." `[LEGAL REVIEW REQUIRED]`
**Empty state:** "Nothing locked yet. Locking raises your membership standing, governance weight, and access — and accrues ecosystem rewards." — [Lock VENT]
**Countdown microcopy:** "Unlocks in {n} days"
**Unlock-ready state:** "Lock complete. Claim your VENT and rewards." — [Claim]

**Lock flow (modal):**
1. **Amount step** — Title: "Lock VENT" · Field label: Amount · helper: "Available: {n} VENT" · error: "Enter an amount up to your available balance."
2. **Period step** — Options: "90 days — rewards up to ~2% annualized · membership boost" / "180 days — up to ~4% · + earlier access" / "365 days — up to ~6% · + full governance weight" · footnote: "Working targets from a fixed pool — not guaranteed. `[LEGAL REVIEW REQUIRED]`"
3. **Confirm step** — Title: "Confirm your lock" · Summary: "{n} VENT · {period} days · unlocks {date}" · Warning: "Locked VENT cannot be accessed, transferred, or unlocked early — for any reason — until the period ends." · Checkbox: "I understand my VENT is inaccessible until {date}." · Button: Lock VENT
4. **Success** — "Locked. {n} VENT committed until {date}. Your membership standing has been updated." — [View Your Position →]
5. **Errors** — Rejected: "Transaction rejected in your wallet. Nothing was locked." · Failed: "The lock transaction failed. Your VENT was not moved. Try again or contact support."

## MODULE — REWARDS

**Card title:** Ecosystem rewards
**Rows:** Lock rewards {n} VENT · Contribution rewards {n} VENT · Total claimable {n} VENT
**Action:** Claim Rewards
**Tooltip:** "Rewards for locking and accepted contributions, paid from fixed pools. Never tied to any investment's performance." `[LEGAL REVIEW REQUIRED]`
**Empty state:** "No rewards yet. Lock VENT or contribute — accepted work earns from the rewards pools." — [See Contribution Paths →]
**Claim success:** "Claimed: {n} VENT added to your available balance."
**Claim error:** "Claim failed. Your rewards are safe — try again."

## MODULE — MEMBERSHIP

**Card title:** Membership
**Primary value:** {MEMBER / RESEARCH / PRO / COUNCIL / BLACK}
**Progress line:** "Next tier: {tier} — requires {n} locked VENT + {n} Reputation. You have {n} / {n}."
**Tooltip:** "Tiers combine locked VENT and earned Reputation. Locking alone won't reach the top — contribution is required."
**Action:** See Membership Levels →
**Upgrade prompt (eligible):** "You qualify for {tier}. Upgrade takes effect immediately." — [Upgrade to {tier}]
**Upgrade success:** "Welcome to {tier}. New access is live across the platform."
**Downgrade warning (lock expiring):** "Your {tier} standing depends on a lock ending {date}. Re-lock to keep tier benefits uninterrupted."

## MODULE — REPUTATION

**Card title:** Reputation
**Primary value:** {score} · {level}
**Rows:** Research accepted {n} · Startups sourced {n} · Assessments {n} · Governance {n}
**Tooltip:** "Earned through accepted contribution. Non-transferable, and it can't be bought."
**Empty state:** "Your record starts with your first accepted contribution." — [See How to Earn →]
**Gain toast:** "+{n} Reputation — {reason} accepted."

## MODULE — RESEARCH

**Card title:** Research
**Rows:** New this week {n} · Early-access items available to you {n}
**Item template:** {Company} · {sector} · VENT Score {n} · published {date} · [Early access — public in {n} days] badge where applicable
**Tooltip (early access):** "As a {RESEARCH/PRO} member, you're reading this before wider release — early intelligence, not investment rights."
**Empty state:** "No new research this week. Watchlist companies will surface here the moment profiles update."
**Gated item state:** "Requires {tier} membership →"

## MODULE — WATCHLIST

**Card title:** Watchlist
**Item template:** {Company} · status {chip} · last update {date}
**Empty state:** "Nothing followed yet. Add companies from Discover to track research updates and status changes." — [Discover Companies]
**Update toast:** "{Company} moved to {status}."
**Remove confirm:** "Remove {Company} from your watchlist? You'll stop receiving its updates." — [Remove / Keep]

## MODULE — GOVERNANCE

**Card title:** Governance
**Rows:** Open votes {n} · Your voting weight {n} — tooltip: "Locked VENT + Reputation, per the published formula."
**Item template:** {Proposal title} · closes {date} · [Vote]
**Empty state:** "No open votes. Proposals in discussion: {n} — join the conversation before they reach the ballot." — [View Proposals →]

**Voting flow (modal):**
- Title: "{Proposal title}" · badge: "Advisory vote"
- Context block: "What this decides: {summary}. What it doesn't: investment decisions of any vehicle — those are outside governance scope." `[LEGAL REVIEW REQUIRED]`
- Options + weight line: "Your weight: {n}"
- Confirm: "Cast your vote: {option}? Votes are final and recorded to your governance history."
- Success: "Vote cast. Results publish {date}."
- Closed error: "This vote closed {time} ago. Results →"

## MODULE — VOTES HISTORY

**Card title:** Your governance history
**Row:** {Proposal} · your vote {option} · outcome {result} · {date}
**Empty state:** "No votes yet. Your governance history builds your Reputation in this pillar."

## MODULE — STARTUP SUBMISSIONS

**Card title:** Your submissions
**Row:** {Company} · {APP-ID} · status: {Received / In Screening / In Research / Decision issued} · updated {date}
**Status tooltips:**
- Received: "Queued for screening in order of submission (or priority, for Accelerated Review)."
- In Screening: "Under first-pass review against published criteria."
- Decision issued: "Outcome and reasons are in your inbox and below."
**Empty state:** "No submissions yet. Founder? Put your company through the pipeline." — [Submit Your Startup]
**Decision states:** Accepted: "Accepted into research. Next: analyst intake within {n} days." · Declined: "Not advanced this time. The reasons — and reapplication criteria — are attached."

## MODULE — NOTIFICATIONS

**Panel title:** Notifications
**Filters:** All · Research · Governance · Rewards · Submissions
**Templates:**
- "New research: {Company} profile published."
- "Early access: {analysis} available to you {n} days before public release."
- "Vote open: {proposal} — closes {date}."
- "Reward claimable: {n} VENT from {source}."
- "Lock update: {n} VENT unlocks in {n} days."
- "Submission update: {Company} moved to {status}."
**Empty state:** "Quiet for now. Notifications arrive with research, votes, rewards, and submission updates."
**Mark all action:** Mark all as read

---

## GLOBAL CONFIRMATION & ERROR PATTERNS

**Destructive confirm pattern:** Title states the consequence ("Remove {x}?") · body states what's lost · actions: [Cancel] / [{Verb}] — destructive verb never on the primary-color button.
**Irreversible confirm pattern (locks, votes):** consequence + checkbox acknowledgement + explicit verb button.
**Error pattern:** what failed → what's safe → what to do. Example: "The claim failed. Your rewards are unaffected. Try again, or contact support with code {ERR}."
**Success pattern:** what happened → what changed → next step link.
