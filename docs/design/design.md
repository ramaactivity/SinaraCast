# Design Document: SinaraCast

> **Status:** v6.1 — CANONICAL Single Source of Truth. Supersedes all earlier drafts (any version describing multi-tenant RLS, Trigger.dev/Vercel-Cron, Stories-as-webhook-only, calendar-first planner, cross-brand broadcasting, or a Notion/Inter visual is obsolete and intentionally discarded).
> **Pairs with:** `prd.md`, `schema.md`, `tsd.md`, `fsd.md`, `meta-setup-runbook.md`. **Visuals are owned by the design system built in Claude Design** (frontend in `Content.zip`); the old `design-system.md` "wefha" system is superseded and not authoritative.
> **Owner:** Rama (solo operator + builder).
> **Last reviewed:** 2026-06-04
> **v6.1 changes:** (1) Meta path updated to **"Instagram API with Instagram Login"** — publishes to Professional (Business/Creator) accounts **without a Facebook Page** (host `graph.instagram.com`; scopes `instagram_business_basic`, `instagram_business_content_publish`); confirm end-to-end in Spike 1. (2) Visual direction is now owned by the Claude Design system; docs are design-agnostic.

> **Reading note for Claude Code / Antigravity:** This is the contract. Schema, PRD, TSD, FSD must conform. Decisions are deliberate, taken over a long discovery. Items needing the human to verify a real-world fact are marked **[VERIFY]**. Reasons are stated so decisions can be challenged on merit.

---

## 1. Vision & Scope

### 1.1 What SinaraCast is
A personal, multi-brand Instagram automation tool for **one operator** (Rama) running **four** Instagram accounts. It plans once and lets content publish itself — especially recurring Instagram Stories — reliably, on **free-tier** infrastructure.

Channels: **Mahakan Coffee** (coffee shop; daily opening-hours Stories), **Tiska Catering**, **Tetra Photobooth**, **Outentika** (boutique / Nadjani).

### 1.2 Core insight — three content types, one engine
One pipeline (build container → wait for processing → publish → record status → alert). Only *how the next thing is chosen* differs:
1. **Recurring Story — Schedule mode** — pool chosen by the day (Mahakan weekday vs weekend hours).
2. **Recurring Story — Pool mode** — one shuffled pool (Tiska, Outentika, extra Mahakan content).
3. **One-off scheduled post** — a single promo/event/campaign post (Phase 2).

Schedule and Pool mode are the **same concept**: a *Recurring Story Rule* = pool(s) + when-to-post + cadence + posting time.

### 1.3 Brand independence (locked)
**Every brand runs independently. NO cross-brand broadcasting.** A rule targets exactly **one** channel. (Identical content on several brands = separate rules per channel.) Deliberate scope boundary.

### 1.4 What v1 is — and is not
**v1 IS:** Instagram only; image-first; single user (magic-link login); four independent channels; the Recurring Story engine as hero, with manual "post now", retries, proactive token refresh, missed-run detection, **channel/brand management, media validation, rule-collision handling, pause-all (vacation) mode, and an in-app notification center**.

**v1 is NOT:** not multi-tenant with multiple humans (schema *allows* future workspaces; v1 builds none); not analytics; not a DM/comment inbox; not a media editor (Canva → upload finished assets); not video yet; **not the Humanist Caption Refiner / Feed posts** (Phase 2 — 1.6); no cross-brand broadcast (1.3).

> The real risk is a fragile pipeline + free-tier limits + Meta access — not too few features. Over-invest in reliability; keep the surface small.

### 1.5 Phased roadmap

| Phase | Scope |
|---|---|
| **Phase 1** | Publish pipeline (image Stories) · Recurring Story rules (Schedule + Pool) · connect 4 channels · post now/test · auto-retry + grace · proactive token refresh · missed-run heartbeat · **channel/brand management (FR-19)** · **media validation (FR-20)** · **rule-collision stagger (FR-21)** · **pause-all / vacation mode (FR-22)** · **in-app notification center (FR-23)** · Telegram alerts · status log + run detail |
| **Phase 2** | One-off scheduled posts · **Feed posts (caption + first-comment-for-hashtags + carousel)** · **Humanist Caption Refiner** · calendar (month + week) · drafts · edit/reschedule one-offs · **shared media library (reuse images across rules)** · tags / campaigns · rules with an end-date (campaign duration) · best-time suggestions |
| **Phase 3** | Video / Reels everywhere |

### 1.6 Why the Humanist Refiner is Phase 2 (not v1)
A Story published via the API is **just media (an image) — the API carries no caption**, and Rama's text is baked into the Canva design. A caption-refiner does nothing in Phase 1; it becomes relevant only with **Feed** posts (which have captions) in Phase 2.

---

## 2. The Recurring Story Model (core concept)

```
Channel (one Instagram account)
   └── Recurring Story Rule  (a channel can have several; each rule = ONE channel only)
          ├── Pool(s) of images   (Schedule rule: 2 — weekday + weekend; Pool rule: 1)
          ├── When-to-post rule    (every day / every N days / specific weekdays)
          ├── Posting time         (per rule, WIB)
          └── Shuffle state        (which images used this cycle)
```

**Shuffle = "shuffle without repeat" (confirmed):** never repeat until the whole pool is used once, then reshuffle. Per-pool "used this cycle" set; pick uniformly from the unused remainder; reset when empty.

**Per-day overrides:** each rule supports **"skip today"** (don't post today) and **"swap today" = manually pick a specific image from the pool for today's post** (instead of the shuffle pick). Plus pre-set future skip dates.

**Posting times are per-rule**, in **WIB** (see 4.6).

> **[VERIFY] Mahakan opening hours:** weekday (Mon–Fri) 14:00–22:00, weekend (Sat–Sun) 09:00–23:00. (Confirmed by Rama 2026-06-03.) ✅

### 2.1 Edge cases & validation (locked, so schema/engine handle them from day one)

- **Timezone:** cron runs UTC; Rama thinks WIB (UTC+7). Convert explicitly. Store WIB-intent; compute UTC fire-times.
- **Media validation (FR-20):** on upload, validate **aspect ratio ≈ 9:16**, **allowed format** (JPEG/PNG for images in v1; MP4 later), and **max file size**. Reject or clearly warn *before* the image enters a pool — so a wrong-ratio asset never publishes cropped/ugly or gets rejected by Meta at post time. Store dimensions/format/size on the asset.
- **Empty pool:** skip + alert "pool kosong, upload dulu". Never error the engine.
- **Single-image pool:** allowed but repeats daily — UI nudges to add more.
- **Editing a pool mid-cycle:** added images join the unused remainder; removed images drop out; the cycle isn't corrupted.
- **Wrong-pool risk (Schedule mode):** app can't read image content, so a weekday design in the weekend pool posts at wrong hours. Mitigation: explicit pool labels + 9:16 preview before saving.
- **Rule collision (FR-21):** if two rules on the **same channel** are due at the same time, the engine **staggers** them (space by N minutes) rather than firing simultaneously — protects against IG rate limits and ordering issues. The rule editor also warns if a new rule's time clashes with an existing one on that channel.

---

## 3. Product Requirements & Flows

### 3.1 Functional requirements (Phase 1)

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Single-user login via **magic link** | Must |
| FR-2 | Connect up to 4 Instagram Business channels (Meta OAuth) | Must |
| FR-3 | Per-channel connection status: Connected / Reconnect / Expiring | Must |
| FR-4 | Create/edit/delete a Recurring Story Rule (Schedule or Pool), one channel each | Must |
| FR-5 | Upload many images into a rule's pool(s) → Supabase Storage | Must |
| FR-6 | Per-rule cadence + posting time (WIB) | Must |
| FR-7 | Engine selects pool (Schedule) + shuffle-picks (no-repeat) | Must |
| FR-8 | Engine auto-publishes the chosen image as a Story at the scheduled time | Must |
| FR-9 | Per-day "skip today" / "swap today" + pre-set holiday dates | Must |
| FR-10 | Telegram alert on any failure (publish error, token issue, missed run) | Must |
| FR-11 | Optional daily "posted ✓" Telegram ping (mutable) | Should |
| FR-12 | Per-channel status log + per-run detail (image, IG link, attempts, reason) | Must |
| FR-13 | Reconnect flow on token failure | Must |
| FR-14 | Storage-usage indicator | Should |
| FR-15 | **Post now / Test** — run any rule immediately | Must |
| FR-16 | **Auto-retry + grace window** — retry transient failures; publish within grace; else skip + alert | Must |
| FR-17 | **Proactive token refresh** — refresh long-lived tokens before expiry; alert only on refresh failure | Must |
| FR-18 | **Missed-run heartbeat** — detect a due run that didn't happen; alert | Must |
| **FR-19** | **Channel / brand management** — rename a brand, set its avatar/color, **add/remove** a brand, and **disconnect** a channel (with confirm). Not just connect/reconnect. | Must |
| **FR-20** | **Media validation on upload** — enforce/warn 9:16 aspect, allowed format, max size before an asset enters a pool | Must |
| **FR-21** | **Rule-collision handling** — stagger co-timed runs on one channel; warn on clashing times in the editor | Must |
| **FR-22** | **Pause-all / vacation mode** — one toggle to pause ALL posting (global) or a single channel, with a clear paused banner + optional auto-resume date; distinct from per-day skip | Must |
| **FR-23** | **In-app notification center** — a bell that **mirrors the Telegram alerts** (history of failures, token issues, missed runs, successes) inside the app, with read/unread | Should |

### 3.2 Key flows

**Onboarding (one-time, manual-heavy):** Meta developer account → app → add the **Instagram product (Instagram API with Instagram Login)** → Development Mode → add self as tester → convert each IG account to **Professional (Business/Creator)** → connect each channel via Instagram Login (**no Facebook Page needed**). A guided **Setup wizard** in-app mirrors the **Meta Setup Runbook** (Rama has no Meta account yet).

**Manage a brand:** add/remove a brand, rename, set avatar/color, disconnect a channel — all from Connections (with a confirm dialog for destructive actions).

**Create a rule:** pick channel → mode → upload images (validated) → set cadence + time (clash-warned) → save → live. Optionally **Post now** to test.

**Daily automation:** scheduler wakes → skip if paused (global/channel) → find due rules → check skip/swap/holiday → select pool (by day if Schedule) → shuffle-pick (or manual swap) → stagger if colliding → publish pipeline (retry/grace) → record status → alert + mirror to in-app bell.

**Go on vacation:** toggle pause-all → no posting until resumed (or auto-resume date) → paused banner everywhere.

---

## 4. Architecture

### 4.1 Stack (100% free tier — hard constraint)
- **Frontend + UI:** Next.js (App Router, Tailwind, **Plus Jakarta Sans**), Vercel Hobby. UI only.
- **DB + Auth + Storage:** **Supabase free** (Postgres, Auth incl. magic-link, Storage).
- **Engine:** **Supabase `pg_cron` + Edge Functions** — `pg_cron` schedules; an Edge Function worker runs the IG pipeline, retries, token-refresh, heartbeat, and collision stagger.
- **Alerts:** **Telegram bot** (free), mirrored to the in-app notification center.
- **Media design:** Canva (external; finished assets uploaded + validated).

### 4.2 Why this engine
Not Vercel Cron (coarse timing, short timeouts, non-commercial Hobby) and not Trigger.dev (another vendor) — everything in Supabase to stay free + minimal. Edge Functions tolerate longer execution than Hobby Vercel functions. **Bonus:** daily `pg_cron` keeps the project non-idle so Supabase free never auto-pauses.

### 4.3 The publish pipeline (per post) — 3-step async
1. **Create container** — `POST /{ig-user-id}/media` (`media_type=STORIES` + public media URL). → `creation_id`.
2. **Poll until `FINISHED`** — never publish a still-processing container.
3. **Publish** — `POST /{ig-user-id}/media_publish`. Store media ID + permalink.

**Idempotency guard (non-negotiable):** atomically claim the run (`pending → publishing`) before publishing; store the published media ID so retries detect "already done." No double-posts.

### 4.4 Reliability & orchestration mechanisms
- **Pause gate (FR-22):** before producing any run, the scheduler checks global pause-all + per-channel pause; paused → produce nothing (and the heartbeat knows not to alarm).
- **Collision stagger (FR-21):** co-timed runs on one channel are spaced by N minutes; respects the ~25/day cap.
- **Auto-retry + grace (FR-16):** transient failures retry with backoff; publish within target + grace window; past it → skipped + alert.
- **Proactive token refresh (FR-17):** periodic `pg_cron` job refreshes long-lived tokens before ~60-day expiry; alert only on refresh failure.
- **Missed-run heartbeat (FR-18):** watchdog compares expected vs actual runs; a due (non-paused) run with no record past grace → alert.
- **Manual post now / test (FR-15):** same pipeline on demand, recorded as a manual run.
- **Alert fan-out:** every alert goes to Telegram **and** the in-app notification center (FR-23).

### 4.5 Auth
Phase 1 = **Supabase magic-link** (email link, no password). Future (scaling/multi-user): migrate to a stronger scheme (e.g. Google OAuth). The `user` concept is generic so the swap is low-cost.

### 4.6 Timezone
Cron runs UTC; rule times authored/displayed in **WIB (UTC+7)**; convert WIB-intent → UTC fire-times explicitly. Never assume server-local time.

### 4.7 Storage strategy (free-tier-safe)
Pool images permanent (reused each cycle); one-off media (Phase 2) deleted after successful publish. Instagram fetches by **public URL** → worker exposes a **time-boxed signed/public URL** during the publish window. Storage-usage indicator (FR-14).

---

## 5. Instagram Integration & Meta Setup Reality

### 5.1 Prerequisites
Each account: **Instagram Professional (Business or Creator)** — Rama admins all 4. **Path: "Instagram API with Instagram Login"** → authenticates directly through Instagram, **no Facebook Page required**. Host `graph.instagram.com`. Scopes: `instagram_business_basic`, `instagram_business_content_publish`. (Personal accounts have no API access — must be Professional.) **[VERIFY in Spike 1]** the exact OAuth/token endpoints + pin a Graph version.

### 5.2 App Review — likely skippable, but a real open risk **[VERIFY]**
Plan: run the Meta app in **Development Mode** with Rama as **tester** → publish to his own/tester accounts **without full App Review**.

**Honest risk:** Dev Mode is intended for *testing*; relying on it for **daily production posting forever** may hit limits/policy long-term. So:
- **Spike 1 tests sustainability, not just feasibility** — can it keep posting daily over time, not just once.
- **Fallback documented:** if unsustainable → **Meta App Review** for `instagram_business_content_publish` (budget weeks; start early if Spike 1 looks shaky). Only the Meta setup step differs; the build doesn't depend on which path wins.

### 5.3 Constraints baked in
- **Story type:** plain image/video auto-publishes via `media_type=STORIES`. Interactive Stories (stickers/polls/links/music/mentions/countdowns) are **out of v1** (Rama's content is finished Canva graphics).
- **Daily cap:** ~25 API posts/account/24h — far above Rama's volume; collision stagger + a warning if a channel nears it.
- **Public media URL** required at publish (Supabase Storage satisfies).
- **Media specs:** 9:16, supported format/size — validated on upload (FR-20) to avoid post-time rejections.
- **Token expiry = #1 killer** → proactive refresh (FR-17) + immediate alert on failure (FR-10/13).
- **API versioned (~quarterly, ~2-yr sunset):** pin a version; track the changelog.

### 5.4 Meta Setup Runbook + in-app Setup wizard
Runbook ships separately (Rama has no Meta account); the in-app Setup wizard mirrors its steps. One-time manual setup.

---

## 6. Data Model (high-level — full schema is the next doc)

Solo-user now, workspace-ready later:
- **user** — single user (Supabase Auth, magic-link). Generic for a future auth swap.
- **app_settings** — global prefs incl. **pause_all** flag + optional resume date, timezone (WIB), default grace minutes, daily-success-ping toggle, Telegram config.
- **channel** — one IG Professional account (Business/Creator): IG user id, encrypted long-lived token, **token status + expiry + last-refreshed**, **editable name, avatar tint/emoji, paused flag**. Add/remove/disconnect supported (FR-19). (No Facebook Page — Instagram-Login path.)
- **recurring_rule** — belongs to exactly **one** channel; `mode` (`schedule` | `pool`); cadence; posting time (WIB); grace minutes; active flag.
- **pool** — belongs to a rule; `schedule` → two (`weekday`, `weekend`), `pool` → one. Shuffle-cycle state.
- **pool_image** — asset in a pool; storage path; **dimensions/aspect/format/size + valid flag** (FR-20); "used this cycle" flag.
- **post_run** — one execution: rule/pool/image, scheduled vs actual time, **trigger type (`scheduled` | `manual` | `retry` | `swap`)**, attempt count, status (`pending → publishing → published | failed | skipped`), IG media id, permalink, failure reason. (Also Phase-2 one-offs.)
- **day_override** — per-rule per-date: skip, or swap-to-specific-image.
- **notification** — in-app center (FR-23): type, message, related run/channel, read flag, created_at. Mirrors Telegram alerts.
- **(derived) run expectation** — for the heartbeat.
- **(Phase 2) scheduled_post**, **media_library**, **tag/campaign**.

> Tokens stored server-side, encrypted; the service role (reads tokens / bypasses row security) is used only by the Edge Function worker + trusted server routes — never the browser.

---

## 7. UI / Visual Direction

**Visuals are owned by the design system built in Claude Design** (implemented in the `Content.zip` frontend). These docs are **design-agnostic** — they specify behavior, data, and views, not look. The earlier `design-system.md` "wefha" system (deep purple/cream/peach, Plus Jakarta Sans) is **superseded** and kept only for history. Visual implementation follows the Claude Design system via `claude-design-brief.md`.

**v1 screens (all approved as mockups):** Rules (home) · Rule editor (Schedule + Pool) · Connections (+ channel management) · Activity (+ run detail) · Settings (+ pause-all, prefs, storage, data) · Login · Magic-link landing · Setup wizard · Connect-Instagram OAuth flow · Profile · Empty/first-run states · Confirm dialog · in-app notification bell.

**Phase 2 screens:** Content Planner (month/week) · one-off Composer + Humanist Refiner.

> Calendar/planner + caption Refiner = Phase 2; do not build in v1.

---

## 8. Free-Tier Constraints & Mitigations

| Constraint | Risk | Mitigation |
|---|---|---|
| Supabase free pauses after ~7 days idle | Automation silently stops | Daily `pg_cron` keeps it active; heartbeat (FR-18) alerts on a missed run |
| Supabase free storage ~1 GB | Pools could grow | Story images small; delete one-off media after publish; usage indicator; media validation caps sizes |
| Supabase free egress ~5 GB/mo | Publishing fetches media | One fetch/post/day = negligible |
| Vercel Hobby cron limits + non-commercial | Can't reliably run the worker | Worker in Supabase; Vercel hosts UI only |
| Edge Function execution limits | Long video processing (Phase 3) | Images fast; revisit when adding video |
| Meta Dev Mode sustainability | Daily posting may hit limits/policy | Spike 1 tests sustainability; App Review fallback (5.2) |

---

## 9. Next Steps

### 9.1 Document order
1. **design.md** ✅ (this).
2. **design-system.md** ✅ (wefha) — to be updated to include all session screens/components before/with the build.
3. **Database Schema** (`schema.md` + SQL) — §6 entities incl. shuffle state, `post_run` state machine + trigger type, token-refresh fields, grace window, pause flags, day_override (skip/swap), media-validation fields, notification table, heartbeat expectations. Solo-user now, workspace-ready later; RLS written with the schema as good hygiene.
4. **PRD** — FRs + flows → acceptance criteria; empty/loading/error states.
5. **TSD** — Meta OAuth + token refresh; 3-step publish + idempotency + retry/grace + collision stagger as worker pseudocode; `pg_cron` schedules (publish tick, token-refresh job, heartbeat); shuffle algorithm; media validation; Telegram + in-app alert contract; WIB↔UTC.
6. **FSD** — screen-by-screen behavior.
7. **Meta Setup Runbook** — one-time manual onboarding.

### 9.2 De-risking spikes (do first)
- **Spike 1 — Meta dev-mode publish + sustainability [the big one]:** connect one Professional (Business/Creator) account via **Instagram Login** in Dev Mode (self as tester), auto-publish image Stories, assess daily sustainability. Decides whether App Review is needed and confirms the Facebook-Page step is fully removable.
- **Spike 2 — `pg_cron` → Edge Function → publish loop** (incl. retry/grace + a forced missed-run for the heartbeat).
- **Spike 3 — Telegram + in-app alert round-trip** (failure + missed-run + token-refresh-failure).

### 9.3 Open items to confirm
- **[VERIFY]** Dev Mode sustainable for daily posting on all 4 accounts; else App Review (§5.2, Spike 1).

---

*End. Database Schema is next and must implement these entities and rules. Build the frontend from `design-system.md`; build the backend from this file, starting with Spike 1.*
