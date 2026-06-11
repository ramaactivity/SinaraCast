# Technical Specification Document (TSD): SinaraCast

> **Changelog:** v1.2 (2026-06-05) — added **Content Planner** auto-fill jobs (publish-success hook + metrics refresh) and the IG-insights caveat; see §14. v1.1 — Instagram Login path.
> **Version:** 1.2
> **Pairs with:** `design.md` v6.1 (architecture/decisions) · `schema.md` v1 (tables) · `prd.md` v2 (behavior). Implements the backend that makes the Claude Design frontend real (swap `mockdata.jsx` for the data layer in §10).
> **Stack:** Next.js (App Router) on Vercel Hobby — UI + thin server routes. Supabase free — Postgres + Auth + Storage. **Supabase `pg_cron` + Edge Functions** — the automation engine. **Instagram API with Instagram Login** (`graph.instagram.com`) — publishing, **no Facebook Page**. Telegram Bot API — alerts.
> **Convention:** anything dependent on Meta's current API surface is marked **[verify in Spike 1]**; pin a Graph API version and confirm endpoints against current docs before building broadly.
> **v1.1 changes:** Meta path set to **Instagram API with Instagram Login** — Professional (Business/Creator) accounts, **no Facebook Page**, host `graph.instagram.com`, scopes `instagram_business_basic` + `instagram_business_content_publish`. Removed `fb_page_id` from the connect flow.

---

## 1. Architecture & trust boundary

```
 Browser (Next.js client)
   │  Supabase JS client (anon key) — RLS-scoped reads/writes of the user's own rows
   │  (NEVER sees channel.access_token)
   ▼
 Next.js server routes / server actions (Vercel)  ── service-role only for privileged ops
   │   - OAuth callback (store tokens)         - post-now trigger
   │   - manual actions needing tokens         - signed-URL minting
   ▼
 Supabase Postgres  ◄──pg_cron (UTC ticks)──►  Edge Function "worker" (service role)
   │   tables per schema.md                       - scheduler tick (publish due runs)
   │                                              - token-refresh job
 Supabase Storage (media)                         - heartbeat watchdog
                                                   │
                                                   ├─► Meta Graph API (publish)
                                                   └─► Telegram Bot API (alerts) + writes notification rows
```

**Trust boundary (critical):** `channel.access_token` and the **service role key** live ONLY server-side (Edge Functions + Next.js server routes). The browser uses the anon key under RLS and can never read tokens. No token or service key is ever shipped to the client or embedded in the bundle.

---

## 2. Environments & secrets

Server-only env (Vercel + Supabase Function secrets):
- `META_APP_ID`, `META_APP_SECRET`, `META_GRAPH_VERSION` — **pinned to `v25.0`** (current on Meta's live content-publishing docs as of 2026-06; [verify in Spike 1] against the actual API response, and track Meta's ~quarterly version + ~2-yr sunset).
- `META_REDIRECT_URI` (OAuth callback).
- `TELEGRAM_BOT_TOKEN`, and the resolved `telegram_chat_id` (stored in `app_settings`).
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (client), `SUPABASE_SERVICE_ROLE_KEY` (server/Edge only).
- `TOKEN_ENC_KEY` — key for encrypting `channel.access_token` (or use Supabase Vault / `pgsodium`).
- `APP_BASE_URL`.

---

## 3. Authentication (magic link)

- Supabase Auth email OTP / magic link. `signInWithOtp({ email })` → email link → callback creates the session; client stores it (Supabase handles refresh).
- On first sign-in, ensure an `app_user` row + an `app_settings` row exist (DB trigger on `auth.users` insert, or upsert on first authenticated request).
- Expired/invalid link → the landing route detects the error and offers "resend".
- Single user; no roles. Future Google OAuth = add a provider, no schema change.

---

## 4. Meta / Instagram integration

### 4.1 Prerequisites (per channel)
IG account = **Professional (Business or Creator)** the user admins — **no Facebook Page required**. App has the **Instagram product (Instagram API with Instagram Login)** added, in **Development Mode**, user added as **tester**. Host: `graph.instagram.com`. Scopes: `instagram_business_basic`, `instagram_business_content_publish`. (Personal accounts have no API access.) **[verify in Spike 1]** exact endpoints + pin a Graph version.

### 4.2 Connect flow (OAuth)
1. Client hits server route `/connect/start?channel=…` → redirect to Meta OAuth dialog (app id, redirect uri, scopes, `state`=CSRF+channel ref).
2. Meta redirects to `/connect/callback?code=…&state=…`.
3. Server route (service role): exchange `code` → short-lived token → **long-lived token** (~60 days). Resolve the **Instagram user id** for the authorized account.
4. Encrypt + store on `channel`: `access_token` (encrypted), `ig_user_id`, `token_status='connected'`, `token_expires_at=now()+~60d`, `last_refresh_at=now()`.
5. On any failure (denied scope, account not Professional) → return a typed error the UI maps to the "permission denied / not eligible" state; `token_status` stays `needs_reconnect`.

> We use **Instagram API with Instagram Login** (direct Instagram OAuth, no Facebook Page). **[verify in Spike 1]** the exact token-exchange + IG-id-resolution endpoints on `graph.instagram.com` and pin the version.

### 4.3 Token storage & refresh
- **Storage:** encrypt `access_token` at rest (`pgsodium`/Vault or app-layer AES with `TOKEN_ENC_KEY`). Never selectable by the client role (kept out of any client view; RLS + column hygiene).
- **Proactive refresh (FR-22):** a daily `pg_cron` job calls a refresh endpoint for channels whose `token_expires_at` is within a window (e.g. ≤7 days) or per Meta's refresh rules (long-lived IG tokens refresh by calling the refresh endpoint while still valid) **[verify]**. On success: update `access_token`, `token_expires_at`, `last_refresh_at`, `token_status='connected'`. On failure: `token_status='needs_reconnect'` + alert.
- `channel_status` UI mapping: `connected` (healthy), `expiring` (within window), `needs_reconnect` (refresh failed / revoked).

### 4.4 Publish pipeline — Story (P1)
3-step async (per `post_run`):
```
1. CREATE container:
   POST /{ig_user_id}/media?media_type=STORIES&image_url={public_or_signed_url}
   → { id: creation_id }
2. POLL until ready:
   loop: GET /{creation_id}?fields=status_code   (backoff; cap attempts)
   until status_code == 'FINISHED'  (or 'ERROR' → fail)
3. PUBLISH:
   POST /{ig_user_id}/media_publish?creation_id={creation_id}
   → { id: ig_media_id }
   then fetch permalink (GET /{ig_media_id}?fields=permalink) [optional]
```
- `image_url` must be **publicly fetchable by Meta** at publish time → mint a time-boxed signed/public Supabase Storage URL (§8).
- Store `ig_media_id` + `permalink` on the run.
- **Image Stories are fast**; video (P3) needs longer polling and earlier start.

### 4.5 Publish pipeline — Feed [P2]
- Single image: `media_type=IMAGE`, `image_url`, `caption` → container → publish.
- **Carousel:** create N child containers (`is_carousel_item=true`), then a parent `media_type=CAROUSEL` with `children=[…]` + `caption` → publish (≤10 items) **[verify limits]**.
- **First comment:** after publish, `POST /{ig_media_id}/comments?message={hashtags}`. Its failure alerts but does NOT fail the post.

### 4.6 Constraints baked in
- Plain image/video Stories only (no stickers/polls/links/music — out of scope).
- ~25 published posts/account/24h cap → collision stagger keeps us well under; warn if a channel nears it.
- Caption only exists for Feed; **Stories carry no caption** (why the refiner is Feed-only / P2).
- Pin Graph API version; watch deprecations.

### 4.7 Error taxonomy → user-facing reason
| Class | Example | Run result | UI/alert |
|---|---|---|---|
| Token | expired/revoked | failed | "Token kedaluwarsa — sambungkan ulang"; flip channel `needs_reconnect` |
| Media fetch | URL unreachable/format | failed (after retry) | "Media gagal diunggah ke Meta" |
| Processing | container `ERROR`/timeout | retry → skip past grace | "Media gagal diproses / timeout" |
| Rate limit | cap hit | skip + alert | "Batas posting harian Instagram" |
| Unknown | 5xx | retry → fail | generic + log raw |

---

## 5. The automation engine

### 5.1 Schedules (`pg_cron`, all UTC)
- **publish tick** — every 1–5 min: select & run due `post_run`s (the hot loop).
- **materialize** — shortly after WIB midnight (e.g. 17:00 UTC = 00:00 WIB): create the day's `pending` `post_run` rows for active, non-paused, due rules (so the tick just claims & publishes). (Alternatively the tick computes due rules on the fly — materializing is simpler to reason about + gives the calendar/heartbeat a concrete expectation.)
- **token-refresh job** — daily: refresh soon-expiring tokens (§4.3).
- **heartbeat** — every ~15 min: detect overdue runs (§5.6).

Each `pg_cron` entry simply invokes the Edge Function worker with a `job` param (`tick` | `materialize` | `refresh` | `heartbeat`). Daily activity also keeps the Supabase project from auto-pausing.

### 5.2 Worker contract (Edge Function)
`POST /worker { job }` (service role). Idempotent; safe to overlap. Returns a summary (counts) + logs. No client access.

### 5.3 Scheduler tick (pseudocode)
```
now = utcNow()
if app_settings.pause_all and (resume_date null or today < resume_date): return  // global pause
due = select * from post_run
        where status='pending' and scheduled_at <= now
        order by scheduled_at
for run in due:
    ch = channel(run); rule = rule(run)
    if ch.paused and (resume_date null or today < resume_date): mark skipped("channel dijeda"); continue
    if ch.token_status != 'connected': fail(run,"token"); alert; continue
    // collision stagger: if another run for same channel is 'publishing' within window, defer briefly
    claimed = update post_run set status='publishing', attempt_count=attempt_count+1
              where id=run.id and status='pending' returning *      // ATOMIC claim → idempotent
    if not claimed: continue                                        // someone else took it
    img = run.image_id or resolveImage(rule, run)                   // see overrides/shuffle
    try:
        url = signedUrl(img.storage_path)
        media = metaPublishStory(ch, url)                           // §4.4 (3-step)
        update run: status='published', published_at=now, ig_media_id, permalink
        markImageUsed(img)                                          // shuffle bookkeeping
        addAttempt(run,"Dipublikasikan ✓")
        if app_settings.daily_ping: accumulateDailySummary(ch)
    catch e:
        addAttempt(run, reason(e), fail=true)
        if transient(e) and withinGrace(run): set status='pending'  // retry next tick
        else: set status='failed', fail_reason=reason(e); alert(ch, run, e)
```

### 5.4 Image resolution (overrides + shuffle)
```
resolveImage(rule, run):
  ov = day_override(rule, todayWIB)
  if ov.type=='skip': mark run skipped; abort
  if ov.type=='swap': return ov.swap_image_id
  pool = (rule.mode=='schedule') ? (isWeekendWIB(run) ? weekendPool : weekdayPool) : singlePool
  return shufflePick(pool)            // §6
```

### 5.5 Retry + grace window (FR-21)
- Transient failures (timeouts, processing-not-ready, 5xx) → leave `pending` with backoff so the next tick retries, **as long as** `now <= scheduled_at + grace_minutes`.
- Past grace → `skipped` (or `failed` for hard errors) + alert.
- `attempt_count` + `post_attempt` rows record each try (mirrors the mock's `attempts[]`).

### 5.6 Heartbeat / missed-run (FR-23)
```
overdue = select run from post_run
            where status='pending' and now > scheduled_at + grace_minutes
            and channel not paused and app not paused
for run: mark skipped("run terlewat"); alert(type=warn,"Run terlewat (heartbeat)")
```
Because runs are materialized daily, a missing/never-run row (infra stall, Supabase paused) is detectable: if expected runs for today don't exist by mid-morning, raise a heartbeat alert. This is the safety net distinct from publish failures.

### 5.7 WIB ↔ UTC
- Rule times are WIB time-of-day. Compute a run's `scheduled_at` (UTC) = that WIB wall-clock on the target date − 7h. WIB has **no DST**, so it's a fixed offset; still convert explicitly (e.g. via a tz-aware lib or `timezone('Asia/Jakarta', ...)` in Postgres). Never use server-local time.

---

## 6. Shuffle algorithm (no-repeat)

```
shufflePick(pool):
  unused = select id from pool_image where pool_id=pool.id and used_in_cycle=false
  if unused is empty:
      update pool_image set used_in_cycle=false where pool_id=pool.id   // reset cycle
      update pool set cycle_started_at=now() where id=pool.id
      unused = (all images)
  pick = random(unused)
  // mark used at publish success time (markImageUsed), not at pick, so failed runs don't burn the cycle
  return pick
```
- `markImageUsed(img)`: `update pool_image set used_in_cycle=true where id=img.id` — only after a successful publish, so retries/failures don't consume the cycle.
- Empty pool → skip + alert. Single image → always returns it (UI nudges to add more).
- Mid-cycle edits: new images default `used_in_cycle=false` (eligible now); deleted images just disappear from the set — cycle stays valid.

---

## 7. (reserved)

---

## 8. Media: validation, storage, URLs

- **Validation (FR-8):** on upload, check aspect ≈ 9:16 (Story) / per-type (Feed), allowed format (JPEG/PNG v1), max bytes. Do it client-side for instant feedback **and** re-validate server-side (Edge/route) before the row is marked valid — never trust the client. Store `width/height/aspect_ok/format/bytes` on `pool_image`/`media_asset`; `aspect_ok=false` blocks selection.
- **Storage:** Supabase Storage buckets (e.g. `pools/`, `library/`, `oneoff/`). Pool/library media = permanent; one-off media may be cleaned after publish (storage hygiene).
- **Publish URL:** Meta fetches by URL → at publish, mint a **time-boxed signed URL** (or a public bucket path) valid for the publish window; don't expose a permanent public URL for private media unless intended.
- **Storage indicator (FR-29):** derive used bytes (`sum(pool_image.bytes)+sum(media_asset.bytes)`) vs the plan limit.

---

## 9. Alerts (Telegram + in-app)

- **Telegram:** server/Edge calls `https://api.telegram.org/bot{TOKEN}/sendMessage` with the stored `telegram_chat_id`. Linking: user starts the bot; a `/connect/telegram` step resolves + stores `telegram_chat_id` + sets `telegram_connected=true`.
- **Fan-out:** every alert does BOTH — send Telegram message AND insert a `notification` row (mirror, FR-26). One helper `notify(owner, type, title, body, channel?, run?)`.
- **Alert events:** publish failure, token-refresh failure / reconnect-needed, missed-run (heartbeat), optional daily success summary (`daily_ping`). Failure alerts are always-on (UI can't disable); daily ping is toggleable.
- Telegram send failure must not crash the worker (log + continue; the in-app mirror still records it).

---

## 10. Frontend ↔ backend data layer (porting mockdata)

Goal: keep the Claude Design presentational components' **look untouched**; change the **data source** only.

> **Reality check — this is a PORT, not a one-file swap.** `frontend/` as shipped is a **no-build browser-React prototype**: a single `index.html` pulling React + Babel from a CDN via `<script type="text/babel">`, every component registered on `window.*`, and all data read from a global `window.MOCK` (see `frontend/app/mockdata.jsx`, `App.jsx`). There is no `package.json`, no JSX build, no router, and no module a Supabase client can drop into as-is. So the wiring step is: **lift these components into the Next.js (App Router) app — same JSX markup, same CSS tokens (`colors_and_type.css` / `content-os.css`), same visual result, NO restyle and NO structural rewrite** — replacing `window.MOCK` reads with the data module below. Treat "don't touch presentational components" as "don't change how they look or what they render"; the unavoidable mechanical change is converting CDN/global wiring into real imports + props.

- Create a small data module (e.g. `app/data/*`) exposing the same shapes `window.MOCK` provides, backed by Supabase queries (per the §9 mapping in `schema.md`). Components keep consuming the same props.
- **Client (anon key, RLS):** all of the user's reads/writes — channels, rules, pools, images upload, runs/activity, notifications, settings, scheduled_posts. RLS guarantees isolation.
- **Server routes / actions (service role):** privileged ops — OAuth connect/callback, token refresh trigger, **post-now** (needs token), minting signed URLs, deleting one-off media. These never run in the browser.
- **Derived fields** (`cycle`, `nextRun`, `todayStatus`, `runs7`, storage, library `usage`) come from SQL views (`v_rule_summary`, `v_activity`, `v_storage`) — see `schema.md` §6.
- Action surface (indicative): `connectChannel`, `reconnectChannel`, `renameBrand`, `createRule/updateRule/deleteRule`, `uploadPoolImage`, `skipToday/swapToday/setHolidays`, `pauseAll/pauseChannel`, `postNow(ruleId)`, `markNotificationRead`, `updateSettings`; [P2] `createScheduledPost/updateDraft/schedulepost`, `refineCaption`, library CRUD.
- **`refineCaption` [P2]:** server route calling the model (brand-voice prompt per channel); returns refined text; UI offers accept/revert/regenerate. Story-only content never calls it.

---

## 11. Security checklist

- Tokens encrypted at rest; only service role reads them; never in client views/bundle.
- Service role key only in Edge Functions / server routes (never `NEXT_PUBLIC_*`).
- RLS enabled on all tables (schema.md §7); client uses anon key.
- OAuth `state` CSRF check on callback.
- Signed URLs time-boxed; private buckets by default.
- Idempotent publishing (atomic claim + unique `claim_key`) → no double-posts.
- Worker tolerant of partial failures (one channel/run failing never blocks others).

---

## 12. De-risking spikes (build order)

1. **Spike 1 — Meta dev-mode publish + sustainability [the big one]:** one Business channel, full connect → 3-step Story publish → confirm it works AND is sustainable for repeated daily posting (not just once). Pins the OAuth/token path + decides App Review need. Do before broad build.
2. **Spike 2 — `pg_cron` → Edge worker loop:** materialize → tick → publish → record, incl. retry/grace + a forced missed run to prove the heartbeat.
3. **Spike 3 — alerts:** Telegram link + send, and the in-app `notification` mirror, for failure / token / heartbeat / daily-ping.

---

## 13. Open / verify items

- **[verify Spike 1]** On `graph.instagram.com` (Instagram Login): exact token-exchange + IG-id resolution + refresh mechanics, and carousel/first-comment limits. Pin a Graph version.
- **[VERIFY]** Dev-Mode daily sustainability (gates go-live; App Review fallback).
- **[DECISION]** Token encryption: Supabase Vault/`pgsodium` vs app-layer AES (recommend Vault/pgsodium if available).
- **[DECISION]** Materialize-then-tick (recommended) vs compute-due-on-the-fly.

---

## 14. Addendum: Content Planner engine hooks (v1.2)

> **Source:** `content-planner-spec.md` §C. Extends §5.3 (publish pipeline) and §5.1 (`pg_cron`). The publish pipeline lives in `spike1/lib/publishCore.js`, driven by `spike1/app/api/cron/route.js` (per-minute tick). These hooks attach there.

### 14.1 Auto-fill on publish success [FR-46]
When a `post_run` (or `scheduled_post`) that a `content_plan` is linked to publishes successfully, set on the plan: `status='posted'`, `posted_at`, `post_link=permalink`, `post_run_id`, `auto_managed=true`. Implementation: after a successful publish in `publishCore` (recurring rule or one-off), look up `content_plan` rows linked via `scheduled_post_id` / `recurring_rule_id` and patch them (service role, bypasses RLS). Idempotent — re-running over an already-`posted` plan is a no-op.

### 14.2 Metrics refresh job [FR-47] — **Instagram-only, on, minimal-cost**
Implemented as `refreshPlanMetricsDue()` in `lib/publishCore.js`, called at the end of the cron tick. For `auto_managed` IG entries (`status='posted'`, feed/reels-class `format`, `post_run_id` set, **posted ≤30 days ago**) it pulls media insights, maps to `m_*`, sets `metrics_source='auto_ig'` + `metrics_updated_at`. Manual entries are never auto-touched.
- **The permission (2026-06-05 spike):** `GET /{ig_media_id}/insights?metric=reach,likes,comments,saved,shares,views` returned **403 (code 10)** with only `instagram_business_basic` + `instagram_business_content_publish`. Fix = add **`instagram_business_manage_insights`** to the OAuth scope (`/connect/start`) and **reconnect** each account. In **Dev Mode** that's free (no App Review) for the app's own tester accounts — same as content_publish today. **Live / other users → Meta App Review** (the proper-SaaS upgrade; see `saas-path`). **Story** insights stay excluded (limited + ephemeral ~24h).
- **Cost control (free-tier-safe):** on by default (kill with `PLAN_METRICS_AUTOPULL=0`); bounded to ≤4 plans/tick, refresh at most once/24h per post, only posts ≤30d old (old metrics are final → stop polling). On a permission/other failure it bumps `metrics_updated_at` to back off, so before reconnect it costs only a few 403s/day and self-heals after reconnect. Manual entry remains the fallback.
- **Decision (2026-06-06):** Instagram-only for now, minimal effort, free-plan-friendly. TikTok/other-platform analytics deferred to the funded SaaS phase (separate APIs, separate approvals, ongoing maintenance — fails the solo-maintainable filter).

### 14.3 Edge cases
- Deleting a `content_plan` linked to a not-yet-published `scheduled_post` → ask whether to also cancel the scheduled publish (unlink vs cancel).
- A linked rule/one-off that fails to publish → the plan stays pre-Posted; the failure surfaces in Activity/alerts as usual; the planner item shows it didn't post.
- Changing platform away from Instagram on an auto-managed entry → unlink + revert to manual (confirm).
- Story metrics expiring → keep whatever was captured; mark "metrik Story terbatas".

---

*Next doc: **FSD** — per-view behavior mapped to the Claude Design screens (signin, onboarding, rules, editor, connections, activity+run detail, notifications, settings, profile; P2 calendar, composer, library; Planner + Content editor), each tied to its FR + this engine. Then the **Meta Setup Runbook**.*
