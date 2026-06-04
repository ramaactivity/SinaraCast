# Meta Setup Runbook: SinaraCast

> **Version:** 1.0
> **Pairs with:** `design.md` v6 · `tsd.md` v1 (§4 Meta integration) · the in-app Onboarding view (which mirrors these steps).
> **Purpose:** the one-time, do-it-once setup to let SinaraCast publish to your four Instagram accounts. You have no Meta account yet — start at Step 0.
> **Important:** Meta's developer console labels and API details change often. The *path* and *facts* below are current as of mid-2026, but **exact button labels may differ** — verify against the live console. Anything that must be proven before building broadly is marked **[Spike 1]**.

---

## Which path we use (and why it's simpler now)

There are two ways to publish to Instagram via API in 2026:

1. **Instagram API with Instagram Login** (a.k.a. "Business Login for Instagram"; the Instagram Platform API / Direct Login, launched July 2024). Authenticates **directly through Instagram**, and **does not require a Facebook Page** linked to the account. Works for Business **and** Creator professional accounts, and supports content publishing. Calls go to `graph.instagram.com`. **← We use this.** It's the lightweight path for publishing to your own accounts.
2. **Instagram Graph API with Facebook Login** (classic). Requires a professional account **plus a connected Facebook Page**, and goes through `graph.facebook.com`. Better when managing many clients' accounts via Business Manager — overkill for one operator.

**Decision:** use path #1 (Instagram Login, no Facebook Page). This removes the "connect a Facebook Page" step from `design.md`/`tsd.md` — confirm it end-to-end in **[Spike 1]** before deleting that step everywhere. (Note: across both paths, **personal accounts cannot use the API** — each account must be a Professional/Business or Creator account.)

---

## Prerequisites
- The 4 Instagram accounts (Mahakan, Tiska, Tetra, Outentika), all admined by you.
- An email for a Meta developer account.
- ~30–45 min total. Free at the platform level (no API fees).

---

## Step 0 — Convert each Instagram account to Professional
For each of the 4 accounts, in the Instagram app: **Settings → Account type and tools → Switch to professional account** → choose **Business** (or Creator — both work on the Instagram-Login path). No Facebook Page step is required for our chosen path.
- ✅ Done when all 4 show as Professional (Business/Creator).

## Step 1 — Create a Meta developer account
1. Go to **developers.facebook.com** → log in with your Meta/Facebook account → **Get Started** → accept the developer terms.
2. Verify your account (email/phone) if prompted.

## Step 2 — Create an App
1. **My Apps → Create App**.
2. Choose an app type that exposes Instagram (typically **Business**), give it a name (e.g. "SinaraCast"), and create it.
3. The app starts in **Development Mode** by default — that's what we want for self-publishing without full review.

## Step 3 — Add the Instagram product (Instagram Login configuration)
1. In the app dashboard, **add the Instagram product** and choose the **"Instagram API with Instagram Login" / "Business Login for Instagram"** configuration (NOT the Facebook-Login/Pages one).
2. Note the **Instagram App ID** and **Instagram App Secret** → these become `META_APP_ID` / `META_APP_SECRET` (Instagram credentials) in your server env.
3. Configure **OAuth redirect URI(s)** to your app's callback (e.g. `https://<your-app>/connect/callback` and a localhost one for dev).
4. Set the requested **permissions/scopes**: `instagram_business_basic` and `instagram_business_content_publish`. (Request only what you need — extra scopes slow any future review.)

## Step 4 — Development Mode + add yourself as a tester
- Keep the app in **Development Mode**. In **App roles / Roles**, add yourself (and, if the console requires per-account testers, the relevant Instagram accounts) as **tester(s)**, and accept the invite.
- In Development Mode with Standard Access, your app can act on **accounts you own / that have a role on the app** — which is exactly your four accounts — **without full App Review**. (Full **App Review + Business Verification** is only needed for **Advanced Access** or when other people who have no role on your app use it — not your case.)
- **[Spike 1] — the critical test:** connect ONE account and confirm you can publish a Story end-to-end, **and** that it keeps working for repeated daily posting (sustainability), not just once. If Development Mode proves unsustainable for daily production, the fallback is to pursue **App Review** for `instagram_business_content_publish`.

## Step 5 — Connect your 4 channels in SinaraCast
For each account, SinaraCast runs the OAuth flow (Business Login for Instagram):
1. App redirects you to Instagram's authorization screen → log in to that account → **grant** the requested permissions (make sure publishing is checked).
2. On return, SinaraCast exchanges the code for a **long-lived access token** (~60 days), resolves the Instagram account id, encrypts + stores the token, and marks the channel **Connected**.
3. Repeat for all four. If a connection fails, it's almost always (a) the account isn't Professional yet, or (b) a permission wasn't granted — fix and retry.

## Step 6 — Token longevity & refresh (handled by the app)
- Tokens are **long-lived (~60 days)**. SinaraCast **auto-refreshes** them before expiry (a daily job), so you don't manage this manually; you'll only get an alert if a refresh *fails* (then reconnect that channel). Token refresh must actually run on schedule — that's why the engine uses a daily cron tick (see `tsd.md` §4.3, §5.1).
- Pin a Graph API version and watch Meta's changelog (versions are supported ~2 years).

## Step 7 — Telegram alerts
1. In Telegram, open **@BotFather** → `/newbot` → name it → copy the **bot token** → set as `TELEGRAM_BOT_TOKEN`.
2. Start a chat with your new bot (send any message) so it can message you back.
3. In SinaraCast → Connections/Settings → **connect Telegram**: it resolves your **chat id** and stores it; you'll get a test message confirming it works.
- Failure alerts are always on; the daily "posted ✓" ping is optional.

---

## Quick reference
| Item | Value |
|---|---|
| API path | Instagram API with Instagram Login (no Facebook Page) |
| Account type | Professional (Business or Creator) — never Personal |
| Scopes | `instagram_business_basic`, `instagram_business_content_publish` |
| API host | `graph.instagram.com` |
| Mode for self-publishing | Development Mode + self/account as tester (Standard Access) |
| Token life | ~60 days, auto-refreshed by the app |
| App Review needed? | No for your own accounts in Dev Mode; only for Advanced Access / external users |
| Cost | Free at platform level |

## Troubleshooting (common first-connection failures)
- **"Account not eligible / not professional"** → finish Step 0 for that account.
- **"Missing permission" / publish fails** → re-run OAuth and ensure `instagram_business_content_publish` was granted.
- **"Invalid OAuth access token / cannot parse"** → you're calling the wrong host; use `graph.instagram.com` for the Instagram-Login path (not `graph.facebook.com`).
- **Token expired** → reconnect the channel; check the auto-refresh job is running.

## [Spike 1] go/no-go checklist
- [ ] One account connects via Instagram Login and returns a long-lived token.
- [ ] A Story publishes end-to-end (create container → FINISHED → publish) to that account.
- [ ] Repeated daily publishing is sustainable in Development Mode (no throttle/policy block over several days).
- [ ] If not sustainable → start App Review for `instagram_business_content_publish`.
- [ ] Confirm whether the Facebook-Page step can be fully removed from `design.md`/`tsd.md` (expected: yes).

---

*This runbook completes the planning set: `design.md`, `prd.md`, `schema.md`, `tsd.md`, `fsd.md`, and this runbook. The in-app Onboarding view should mirror Steps 0–7.*
