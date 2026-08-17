# VENT — Global Microcopy

Cross-page UI copy. Navbar and footer live in `en/01-home.md` (Sections 01 and 26); app-interior states live in `en/24-app.md`. This file covers everything shared between pages.

---

## 1. Cookie banner

**Title:** Cookies, plainly.
**Body:** We use essential cookies to run the site, and optional analytics cookies to understand what's worth improving. No advertising trackers.
**Buttons:** Accept All · Essential Only · Cookie Settings
**Settings modal:**
- Essential — "Required for the site to function. Always on."
- Analytics — "Anonymous usage measurement. Helps us improve." — toggle
- Save action: Save Preferences
**Confirmation toast:** "Cookie preferences saved."

## 2. Newsletter (all placements)

**Field placeholder:** Your work email
**Button:** Subscribe
**Success:** "You're subscribed. First briefing arrives with the next edition."
**Already subscribed:** "This email is already on the list."
**Invalid:** "That email doesn't look right — check and try again."
**Server error:** "Subscription didn't go through. Try again in a moment."
**Footer note:** "Unsubscribe anytime. Privacy Policy →"

## 3. Form conventions (site-wide)

- Required marker: "*" with legend "Required" — optional fields labelled "(optional)" instead where a form is mostly required.
- Inline validation on blur; summary on submit: "A few fields need attention: {list}"
- Generic field errors: Required → "This field is required." · Email → "Enter a valid email address." · URL → "Enter a valid URL (https://…)." · Number → "Enter a number." · Too long → "Keep this under {n} characters."
- Autosave (long forms): "Draft saved {time}."

## 4. Account creation

**Title:** Create your VENT account
**Fields:** Email · Password ("At least 12 characters. A passphrase works well.") · Country of residence ("Determines available features under applicable regulation.") `[LEGAL REVIEW REQUIRED]`
**Consent checkbox:** "I accept the Terms of Service and Privacy Policy." — error: "Acceptance is required to create an account."
**Marketing checkbox (optional):** "Send me VENT Intelligence briefings."
**Button:** Create Account
**Success:** "Account created. We've sent a verification link to {email}."
**Verify screen:** "Verify your email — the link expires in {n} hours." · Resend: "Resend link" · Resent: "A new link is on its way."
**Errors:** Taken → "An account with this email exists. Sign in instead →" · Weak password → "Make it longer — 12+ characters."

## 5. Login

**Title:** Sign in
**Fields:** Email · Password
**Actions:** Sign In · "Forgot password?"
**2FA step:** "Enter the 6-digit code from your authenticator app." — error: "That code didn't match. Codes rotate every 30 seconds."
**Reset flow:** "Enter your email — if an account exists, a reset link is on its way." *(same message either way; no account enumeration)*
**Errors:** Bad credentials → "Email or password is incorrect." · Locked → "Too many attempts. Try again in {n} minutes."

## 6. Wallet connection

**Prompt title:** Connect a wallet
**Body:** "Connect to hold, lock, and claim VENT. VENT will never ask for your seed phrase — anywhere, ever."
**Options:** [PLACEHOLDER: supported wallets]
**States:** Connecting… · Connected: "{address short} connected." · Rejected: "Connection cancelled in your wallet. Nothing was shared." · Wrong network: "Switch to [PLACEHOLDER: network] to continue." — [Switch Network]
**Verify-ownership step:** "Sign a free message to verify this wallet. Signing costs nothing and moves nothing."
**Disconnect confirm:** "Disconnect {address short}? Your balances stay where they are; the app just stops displaying them."

## 7. VENT Lock (cross-page prompts)

**Entry-point banner (signed-out):** "VENT Lock raises membership, governance weight, and access. Sign in to lock." — [Sign In]
**Entry-point banner (no balance):** "Locking requires VENT in your connected wallet." — [View the Distribution →]
*(Full lock flow: `en/24-app.md`.)*

## 8. Voting (cross-page prompts)

**Signed-out prompt:** "Voting is open to members. Sign in to cast your advisory vote."
**No-weight prompt:** "Your voting weight is 0 — lock VENT or earn Reputation to participate."
*(Full ballot flow: `en/24-app.md`.)*

## 9. Research gating

**Teaser wall (public → member):**
**Title:** You've reached the members' depth.
**Body:** "The full profile — all fourteen sections and the complete score rationale — is available to VENT members."
**CTA:** Join the Ecosystem · secondary: See Membership Levels →

**Tier wall (member → RESEARCH/PRO):**
**Title:** This analysis sits in the {RESEARCH/PRO} tier.
**Body:** "Advanced intelligence and 7-day early access come with deeper membership."
**CTA:** See Membership Levels →

**Early-access badge:** "Early access — public in {n} days"

## 10. Membership upgrade

**Prompt (eligible):** "You qualify for {tier}. Upgrade takes effect immediately." — [Upgrade to {tier}]
**Prompt (not eligible):** "{tier} requires {n} locked VENT + {n} Reputation. You're at {n} / {n}." — [Lock VENT] · [See How to Earn Reputation →]
**Success:** "Welcome to {tier}. New access is live."

## 11. Waitlists

**Generic pre-launch:** "This opens in {phase}. Leave your email and we'll tell you the day it's live." — field: Your email — button: Get Notified at Launch — success: "Noted. You'll hear from us at launch — and not before."
**Institutional waitlist:** see `en/15-ventures-i.md`, Section 13.

## 12. Startup submission (cross-page)

**Entry banner:** "Standard applications are free. Accelerated Review shortens the queue — never the criteria." — [Submit Your Startup]
*(Full form: `en/13-startups-apply.md`.)*

## 13. KYC (placeholder flow)

**Intro:** "Identity verification is required for the distribution and selected features. Handled by [PLACEHOLDER: provider]; typically minutes."
**Needed list:** Government-issued ID · a quick selfie check · proof of address where required
**States:** In progress → "Verification under way. We'll email you the moment it completes." · Approved → "Verified. All eligible features are unlocked." · Manual review → "Your documents need a human look — up to [PLACEHOLDER: n] business days." · Rejected → "We couldn't verify your identity. See the reason and options in your dashboard."
**Privacy note:** "Documents are processed for verification under the Privacy Policy — never for marketing." `[LEGAL REVIEW REQUIRED]`

## 14. Token distribution notices

**Pre-open notice:** "The distribution hasn't opened. Official dates will appear here and in the briefing — nowhere else first."
**Open notice:** "Round in progress: {round}. Published price: {price}. Eligibility and documents apply." `[LEGAL REVIEW REQUIRED]`
**Jurisdiction block:** "Based on your details, participation isn't available in your jurisdiction. This restriction is legal, not personal." `[LEGAL REVIEW REQUIRED]`
**Anti-scam line (persistent on sale surfaces):** "VENT has one distribution site: [PLACEHOLDER: official URL]. No DMs, no 'support' wallets, no exceptions."
**Post-close notice:** "This round has closed. Allocation and claim details are in your dashboard."

## 15. Global toasts & errors

- Saved: "Saved."
- Copied: "Copied to clipboard."
- Generic failure: "Something went wrong on our side. Try again — if it persists, contact support with code {ERR}."
- Rate limit: "Too many requests. Give it a minute."
- Maintenance: "Scheduled maintenance in progress. Back by {time}."
