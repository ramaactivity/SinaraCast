# Product Requirements Document: SinaraCast

> **Version:** 2.0 — **Design-agnostic.** This PRD deliberately contains **no visual, UI, or frontend detail** (no colors, components, layout, typography, or styling). The visual design system is being built separately (in Claude Design) and will be applied on top of these requirements. For technical architecture see `design.md`; for visuals see the separate design system.
> **Status:** Draft for build. Scope spans all phases; each requirement is tagged with a release phase (P1 = core MVP, P2 = expansion, P3 = video) as a build-order recommendation — everything here is fully specified so the design system can be designed against the complete product.
> **Owner:** Rama (solo operator + builder).
> **Audience:** product/design/build — defines *what the product does and when a feature is "done"*, not *how it looks or is coded*.

---

## 1. Purpose & Definition of Done

SinaraCast lets one operator (Rama) run automated, recurring Instagram **Stories** — and, in later phases, scheduled one-off posts and a content calendar — across four independent brands, reliably, with low effort.

**Core (P1) is "done" when, for all four connected channels:**
1. A Recurring Story Rule reliably auto-publishes the correct media at the correct time (WIB) every scheduled day for ≥7 consecutive days with no manual intervention.
2. Every failure (publish error, token issue, missed run) reaches the user via Telegram **and** an in-app notification, with a clear reason.
3. No post is ever published twice.
4. The user can fully self-serve every capability below without any database access.

---

## 2. User, Brands & Jobs-to-be-Done

- **User:** single user (Rama). No other human accounts in P1 (multi-user is a future consideration only).
- **Brands (channels):** Mahakan Coffee, Tiska Catering, Tetra Photobooth, Outentika — **independent**; no cross-brand broadcasting (identical content on several brands = separate rules per channel).
- **Jobs:** (1) "Set my daily Stories once and trust they post." (2) "Tell me immediately if something breaks." (3) "Let me skip/swap/pause when life happens." (4) "See what posted; debug what didn't." (5) [P2] "Plan and schedule one-off promos/events on a calendar." (6) [P2] "Reuse my media and keep captions in my brand voice."

---

## 3. Scope & Release Phases

| Phase | Capabilities |
|---|---|
| **P1 — Core** | Auth · connect & manage channels · Recurring Story Rules (Schedule + Pool) · pools + media validation · no-repeat shuffle · per-rule scheduling + collision handling · per-day skip/swap + holidays · pause-all (vacation) · post-now/test · reliability (retry + grace, proactive token refresh, missed-run heartbeat) · alerts (Telegram + in-app center) · activity log + run detail · storage indicator · settings · onboarding |
| **P2 — Expansion** | **Content calendar (month + week)** · one-off scheduled posts · **Instagram Feed posts** (caption + first-comment hashtags + carousel) · **caption refiner (brand-voice AI)** · drafts · edit/reschedule scheduled posts · **shared media library** · tags / campaigns · recurring rules with an end-date · best-time suggestions |
| **P3 — Video** | Video / Reels everywhere (assets, processing, publishing) |

**Permanently out of scope:** analytics dashboards, DM/comment inbox, in-app media editing/design (media is created externally and uploaded), multi-tenant/multi-user, interactive Story elements (stickers/polls/links/music/mentions/countdowns).

---

## 4. Global Behavioral Conventions (apply everywhere; functional, not visual)

- **Timezone:** all scheduling is authored and shown in **WIB (UTC+7)**; the system converts internally and never relies on server-local time.
- **Brand isolation:** every rule/post/run belongs to exactly one channel; data is never mixed across brands.
- **Destructive actions** (delete rule/post, remove/disconnect channel, delete data) require an explicit confirmation that names the consequence.
- **Validation** happens before commit; the user cannot save/schedule an invalid item, and the reason is stated.
- **States:** every data view must meaningfully handle **loading**, **empty** (with a clear way to create the first item), **error** (with a reason + retry), and **success/populated** — no silent blanks or dead ends. (Behavioral requirement; appearance is the design system's concern.)
- **Notifications:** important events are delivered to Telegram **and** the in-app notification center; transient confirmations are shown in-app.
- **Copy/voice:** Indonesian, warm and plain, matching the brand voice.
- **Reversibility:** prefer reversible actions; where irreversible, confirm.

---

## 5. Functional Requirements & Acceptance Criteria

Each item: phase tag · requirement · acceptance criteria (✓ = must verify). Appearance is intentionally unspecified.

### 5.1 Authentication [P1]
**FR-1 — Magic-link login.** The user signs in with an email link; no password.
✓ Submitting a valid email sends a sign-in link and confirms it was sent.
✓ Following the link signs the user in; an expired/invalid link offers to resend (no dead end).
✓ Session persists across reloads; the user can sign out.

### 5.2 Channels & brand management [P1]
**FR-2 — Connect channels.** Connect up to 4 Instagram Business channels via Meta authorization.
**FR-3 — Connection status.** Each channel shows Connected / Needs-reconnect / Expiring.
**FR-4 — Reconnect.** A token failure surfaces a reconnect action; the system does not attempt to publish for a broken channel.
**FR-5 — Manage brands.** Rename a brand; set its identity (avatar/label); add a brand (up to 4); remove a brand; disconnect a channel.
✓ The authorization flow communicates connecting / success / failure (incl. missing-permission) clearly.
✓ Removing/disconnecting requires confirmation and states what happens to that brand's rules. **[DECISION NEEDED] On removal, that brand's rules are disabled (recommended) or deleted — confirm.**
✓ Channel cap = 4; adding is blocked with an explanation at the cap.

### 5.3 Recurring Story Rules — CRUD [P1]
**FR-6 — Create/edit/delete rules.** Each rule targets exactly one channel and one mode: **Schedule** (separate weekday/weekend pools) or **Pool** (one shuffled pool).
✓ A rule requires: name, channel, mode, ≥1 valid image per required pool, cadence, and a posting time; it cannot be saved otherwise.
✓ Deleting a rule confirms, keeps the pool media, removes the schedule, and is irreversible.
✓ A channel can hold multiple rules.

### 5.4 Pools, media upload & validation [P1]
**FR-7 — Pool media.** Upload many images into a rule's pool(s); remove images.
**FR-8 — Media validation.** On upload, validate aspect ratio (Story = 9:16), allowed format, and max size; invalid media is rejected/flagged with a reason and can never be the published asset.
✓ Schedule-mode pools are unambiguously distinguished as weekday vs weekend.
✓ Upload shows progress; a failed upload reports the error and is retryable; no silent drops.
✓ Empty pool → the rule skips that day and alerts; single-image pool is allowed with a nudge to add more.

### 5.5 Selection, shuffle & publishing [P1]
**FR-9 — No-repeat shuffle.** Within a cycle no image repeats until the whole pool has been used once; then it reshuffles. (Verifiable in run history.)
**FR-10 — Correct pool by day (Schedule).** Weekdays draw from the weekday pool; weekends from the weekend pool, per the confirmed mapping (Mahakan weekday 14:00–22:00, weekend 09:00–23:00).
**FR-11 — Auto-publish.** At the scheduled WIB time the chosen image publishes as a Story; the run is logged with the resulting post link.
**FR-12 — No double-post.** Re-runs, retries, and overlapping triggers never produce two posts for one scheduled run.
**FR-13 — Mid-cycle pool edit.** Added images become eligible within the current cycle; removed images stop being eligible; the cycle is not corrupted.

### 5.6 Scheduling & collisions [P1]
**FR-14 — Per-rule cadence + time.** Cadence = daily / every N days / specific weekdays; posting time per rule (WIB); a per-rule grace window.
**FR-15 — Collision handling.** Two rules on the same channel due at the same time are spaced apart automatically; the user is warned when a new rule's time clashes with an existing rule on that channel.

### 5.7 Overrides & pause [P1]
**FR-16 — Skip today.** One action marks today's run for a rule as skipped.
**FR-17 — Swap today.** The user manually selects a specific image from the pool for today's post (instead of the shuffle pick), for today only.
**FR-18 — Holiday dates.** Pre-set future dates on which a rule skips.
**FR-19 — Pause-all / vacation.** A single control pauses all posting (global), plus a per-channel pause; while paused nothing publishes, missed-run alerts are suppressed, and an optional auto-resume date un-pauses automatically. Distinct from per-day skip and from a rule's active/inactive toggle.

### 5.8 Manual run [P1]
**FR-20 — Post now / test.** Run any rule immediately (shuffle-pick + publish), logged as a manual run distinct from scheduled runs; respects validation and pause state; result (success + link, or failure + reason) is reported promptly with retry on failure.

### 5.9 Reliability [P1]
**FR-21 — Auto-retry + grace.** Transient publish failures retry with backoff; if success occurs within the grace window it still counts as published (logged with actual time); past the window it is marked skipped and alerts.
**FR-22 — Proactive token refresh.** Long-lived tokens are refreshed before expiry without user action; only a failed refresh alerts and flips the channel to Needs-reconnect.
**FR-23 — Missed-run heartbeat.** A due (non-paused) run that doesn't occur within its grace window raises a missed-run alert, worded distinctly from a publish failure (safety net for infrastructure stalls).

### 5.10 Alerts & notification center [P1]
**FR-24 — Telegram alerts.** Any failure (publish, token/refresh, missed run) sends a Telegram message with a human-readable reason; this path is always on and cannot be disabled.
**FR-25 — Daily success ping.** An optional daily "posted ✓" Telegram summary, toggleable. **[DECISION NEEDED] default on (recommended) or off.**
**FR-26 — In-app notification center.** Mirrors the alerts (failures, token issues, missed runs, successes) with timestamps and read/unread; opening an item links to the related run/channel.

### 5.11 Activity & run detail [P1]
**FR-27 — Activity log.** A reverse-chronological log of runs across channels, filterable by channel, with each run's status (Published / Scheduled / Publishing / Failed / Skipped) and a retry on failures.
**FR-28 — Run detail.** Opening a run shows: the media used, channel, rule, pool/image, scheduled vs actual time, trigger type (scheduled/manual/retry/swap), status, post link (if published), and an attempt log (each try + outcome).

### 5.12 Storage [P1]
**FR-29 — Storage indicator.** Show storage used vs available and warn as it nears the limit.

### 5.13 Settings [P1]
**FR-30 — App settings.** Configure: alert preferences (Telegram connection; failure-alert always on; daily-ping toggle), timezone (WIB), default grace window, storage overview, export data, delete-all-data (confirmed). Profile: name, email, login method, sign out.

### 5.14 Onboarding [P1]
**FR-31 — Setup guide.** A stepped onboarding mirroring the one-time Meta setup (developer account + app in Development Mode → convert IG accounts to Business + connect Pages → connect channels → set up Telegram). Steppable, resumable, re-accessible later, linking to the full Meta Setup Runbook.

---

### 5.15 Content Calendar / Planner [P2]
**FR-32 — Calendar views.** Month and week views showing scheduled and published content per day across (or filtered by) channel — both the auto-generated recurring runs (read-only previews of what each rule will post) and one-off scheduled posts.
✓ Navigate by month/week; today is identifiable; switch month↔week.
✓ Each day shows its items (rule runs + one-off posts) with status.
✓ Selecting an item opens its detail: a one-off opens its editor; a recurring run links to its rule and offers skip/swap for that day.
✓ Optionally create a one-off post for a chosen date directly from the calendar.
✓ Filter by channel.
- States: empty month (no scheduled content) handled clearly.

### 5.16 One-off Scheduled Posts [P2]
**FR-33 — One-off posts.** Create a single post for one channel, of type **Story** or **Feed**, with media + (Feed) caption, scheduled for a specific date/time (WIB); it publishes once via the same reliable pipeline (retry/grace, idempotency, alerts).
✓ Validation matches the post type (Story media = 9:16; Feed media per Feed specs).
✓ A scheduled one-off appears in the calendar and activity log; it can be edited or rescheduled before it publishes, and canceled (confirmed).
✓ After publishing, its temporary media may be cleaned up (storage hygiene); the run record persists.

### 5.17 Instagram Feed Posts [P2]
**FR-34 — Feed posts.** Support Feed image posts with: a caption, an optional **first comment** auto-posted after publish (for hashtags), and **carousel** (multiple images in one post, up to the platform limit).
✓ Caption length and carousel count respect Instagram limits, validated before scheduling.
✓ First comment posts automatically immediately after the main post succeeds; its failure is alerted but does not fail the post.

### 5.18 Caption Refiner (brand voice) [P2]
**FR-35 — Humanist caption refiner.** For caption-bearing posts (Feed), an AI action rewrites a draft caption into the brand's natural, customer-centric voice (no stiff/AI-sounding copy).
✓ The user can run it on a draft, then accept, revert to the original, or regenerate.
✓ Voice/guidelines are configurable per brand.
✓ Applies only where captions exist (Stories have no caption via the API — so the refiner is absent for Story-only content).

### 5.19 Drafts, Edit & Reschedule [P2]
**FR-36 — Drafts.** Save an incomplete one-off post and resume later.
**FR-37 — Edit / reschedule.** Change a scheduled one-off's content or time before it publishes; reflected everywhere (calendar, activity).

### 5.20 Shared Media Library [P2]
**FR-38 — Media library.** A repository of uploaded media reusable across rules and one-off posts (per brand), searchable/taggable, so the same asset isn't re-uploaded; deleting library media warns if it's in use.

### 5.21 Tags / Campaigns [P2]
**FR-39 — Tags & campaigns.** Group rules/posts/media under campaign tags; filter content (and calendar) by campaign.

### 5.22 End-dated Rules [P2]
**FR-40 — Campaign-duration rules.** A recurring rule may have an end date, after which it auto-deactivates (for limited campaigns).

### 5.23 Best-time Suggestions [P2]
**FR-41 — Best-time hints.** Suggest posting times per channel based on history/heuristics, as non-binding recommendations when setting a rule/post time.

---

### 5.24 Video / Reels [P3]
**FR-42 — Video.** Support video assets and Reels publishing (longer upload/processing handled in the pipeline; validation for video specs; the engine starts processing earlier to absorb encode time).

---

## 6. Information Architecture — Views (functional, not visual)

The product needs the following views. Described by **purpose, key actions, and data shown** only — appearance is the design system's job.

- **Sign-in** — request a magic link; confirm sent; handle link landing (signing-in / expired-resend). [P1]
- **Onboarding / Setup** — guided Meta setup steps with progress; resumable. [P1]
- **Rules (per channel)** — list this channel's rules; create a rule; open/edit/delete a rule; per-rule active toggle and post-now; at-a-glance status; quick counts/summary of activity. [P1]
- **Rule editor** — configure a rule: mode, pool(s) + media (with validation + shuffle state), cadence, time, grace, holidays/skip; save; post-now; delete. [P1]
- **Connections** — list channels with status; connect/reconnect/disconnect; rename/identity/add/remove; Telegram alert setup; Meta setup checklist. [P1]
- **Activity** — filterable run log; open run detail (with attempt log); retry failures; storage indicator. [P1]
- **Notification center** — list of mirrored alerts with read/unread; deep-link to source. [P1]
- **Settings** — alert prefs, timezone, default grace, storage/data, pause-all. [P1]
- **Profile** — identity, login method, sign out. [P1]
- **Calendar / Planner** — month/week of scheduled + published content across channels; open items; create one-off; filter by channel/campaign. [P2]
- **Composer (one-off post)** — choose channel + type (Story/Feed), add media (or pick from library), write caption + first comment (Feed), run the refiner, set schedule, save draft or schedule. [P2]
- **Media library** — browse/search/tag reusable media per brand; see usage. [P2]
- **Campaigns/Tags** — manage tags; filter content by campaign. [P2]

> A view's existence here is a product requirement; its layout, styling, and components are defined entirely by the separate design system.

---

## 7. Data Entities (conceptual — full schema is a separate doc)

Single-user now, structured to allow future workspaces. Entities (conceptual; not storage-prescriptive here):
- **user** — the single account (auth, magic-link).
- **app_settings** — global prefs: pause-all (+ resume date), timezone, default grace, daily-ping toggle, alert config.
- **channel** — an IG Business account: identity (name, label), connection + token state (status, expiry, last-refreshed), paused flag.
- **recurring_rule** — one channel; mode (schedule/pool); cadence; time; grace; active; optional end-date [P2].
- **pool** — belongs to a rule (two for schedule: weekday/weekend; one for pool); shuffle-cycle state.
- **pool_image** — media in a pool; validation metadata; used-this-cycle flag.
- **post_run** — one execution: rule/pool/image (or one-off), scheduled vs actual time, trigger type (scheduled/manual/retry/swap), attempt count, status (pending→publishing→published|failed|skipped), post link, failure reason.
- **day_override** — per-rule per-date skip or swap-to-image.
- **notification** — in-app alert mirror (type, message, related run/channel, read).
- **scheduled_post** [P2] — one-off: channel, type (story/feed), media, caption, first-comment, carousel items, schedule, status, draft flag.
- **media_asset / media_library** [P2] — reusable media per brand; usage links; tags.
- **tag / campaign** [P2] — grouping for rules/posts/media.

---

## 8. Non-Functional Requirements

- **Reliability:** no double-posts (idempotent publishing); a daily successful-run streak is the core health metric; every failure alerted within minutes.
- **Cost:** must operate within free-tier limits at the user's real volume; media management (validation caps, cleanup of one-off media, usage indicator) keeps storage in bounds.
- **Security:** platform tokens stored securely server-side and never exposed to the client; single-user access; destructive actions confirmed.
- **Correctness:** WIB↔UTC conversion is exact.
- **Responsiveness:** views render a meaningful state quickly; uploads show progress; the UI never blocks on the automation engine.
- **Resilience:** one channel failing never affects others; a paused channel is fully inert.

---

## 9. Acceptance / Launch Checklist

**P1 launch:**
- [ ] Spike: a Story auto-publishes to one Business account in Development Mode, with daily sustainability assessed (else App Review path chosen).
- [ ] All 4 channels connect, show correct status, reconnect cleanly; brand management works.
- [ ] Rules CRUD in both modes; media validation rejects bad files.
- [ ] A rule auto-publishes correctly for ≥7 consecutive days (correct pool by day; no early shuffle repeats).
- [ ] No double-post under retry/overlap.
- [ ] Skip/swap/holiday/pause-all behave correctly.
- [ ] Post-now works and is labeled manual.
- [ ] Token refresh runs; a forced refresh failure alerts + flips to reconnect.
- [ ] A forced missed run triggers the heartbeat alert.
- [ ] Failures appear in Telegram and the in-app center with clear reasons.
- [ ] Activity + run detail accurate (incl. attempt logs); storage indicator accurate.
- [ ] Every view handles loading/empty/error.

**P2 launch (incremental):** calendar (month/week) accurate vs rules + one-offs · one-off posts publish reliably · Feed (caption/first-comment/carousel) within platform limits · refiner accept/revert/regenerate · drafts + edit/reschedule · media library reuse · tags/campaign filtering · end-dated rules auto-deactivate · best-time hints shown.

---

## 10. Open Questions

- **[VERIFY]** Meta Development Mode sustainable for daily posting on all 4 accounts; else Meta App Review (`instagram_content_publish`). Gates P1 launch.
- **[DECISION]** On brand remove/disconnect: rules **disabled** (recommended) or **deleted**?
- **[DECISION]** Daily "posted ✓" ping default: **on** (recommended) or off?
- **[DECISION]** Confirm Mahakan opening-hours mapping (already confirmed: weekday 14:00–22:00, weekend 09:00–23:00).
- **[FUTURE]** Auth upgrade path (e.g. Google OAuth) when/if multi-user is pursued.

---

*End. This PRD is design-agnostic by intent; the design system (built separately) will be applied to these views and behaviors. Technical implementation lives in `design.md` and the forthcoming Database Schema / TSD.*
