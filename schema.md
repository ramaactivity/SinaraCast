# Database Schema: SinaraCast

> **Version:** 1.1
> **Pairs with:** `design.md` v6.1 (architecture + data model §6) · `prd.md` v2 (entities §7) · `tsd.md` v1.1 · the Claude Design frontend (`app/mockdata.jsx` — this schema maps 1:1 to it).
> **Target:** Supabase (PostgreSQL 15). This is the backend spine; when wiring the frontend, replace `mockdata.jsx`/`store.jsx` reads with queries against these tables — the field mapping is in §9.
> **Scope:** P1 tables are core; tables/columns tagged **[P2]** support the expansion phase (calendar, one-off posts, library, campaigns) and can be created now or later without breaking P1.
> **v1.1:** `channel` uses the **Instagram Login** path — `ig_user_id` only, **no `fb_page_id`** (no Facebook Page).

---

## 1. Conventions

- **PKs:** `uuid` default `gen_random_uuid()`. (The frontend's friendly ids like `"mahakan"`, `"r1"` are mock-only; real rows use UUIDs. `channel.slug` preserves a stable human key.)
- **Timestamps:** `timestamptz`, always stored **UTC**. Display converts to **WIB (Asia/Jakarta, UTC+7)**.
- **Recurring times** (a rule's posting time) are stored as `time` (time-of-day, no date) and interpreted in WIB by the engine — not as timestamps.
- **Enums:** Postgres `enum` types for fixed sets (see §3).
- **No hard deletes** for channels/rules where history matters → use `archived_at` (soft delete) so `post_run` history stays valid. Pool images can hard-delete.
- **Money/counts:** integers. **Bytes** for storage.
- **Naming:** `snake_case` columns; tables singular-ish domain nouns.
- **RLS:** enabled on every table (§7). Single-user today, but written as if multi-tenant-ready (`owner_id`), so the future auth swap is cheap.

---

## 2. Entity overview (ERD, text)

```
auth.users (Supabase)
  └─ app_user (1:1 profile)         owner of everything
       ├─ app_settings (1:1)
       ├─ channel (1..4)
       │    ├─ recurring_rule (0..n)
       │    │    ├─ pool (1 for 'pool' mode, 2 for 'schedule': weekday+weekend)
       │    │    │    └─ pool_image (0..n)   ← shuffle cycle state lives here
       │    │    ├─ day_override (0..n)       skip / swap per date
       │    │    └─ post_run (0..n)           ← also FK to pool_image actually posted
       │    │         └─ post_attempt (1..n)  retry/attempt log
       │    ├─ scheduled_post [P2] (0..n)      one-off Story/Feed
       │    │    └─ scheduled_post_media [P2]  ordered carousel items → media_asset
       │    ├─ media_asset [P2] (0..n)         shared library
       │    └─ notification (0..n)             mirror of alerts
       └─ campaign [P2] (0..n)                 tag/grouping
```

---

## 3. Enum types

```sql
create type rule_mode      as enum ('schedule','pool');
create type pool_role      as enum ('single','weekday','weekend');
create type cadence_type   as enum ('daily','every_n_days','weekdays');
create type channel_status as enum ('connected','expiring','needs_reconnect');
create type run_status     as enum ('pending','publishing','published','failed','skipped');
create type run_trigger    as enum ('scheduled','manual','retry','swap');
create type override_type  as enum ('skip','swap');
create type notif_type     as enum ('error','warn','success');
create type post_type      as enum ('story','feed');          -- [P2]
create type sched_status   as enum ('draft','scheduled','publishing','published','failed','canceled'); -- [P2]
```

---

## 4. Core tables (P1)

### 4.1 app_user (profile)
```sql
create table app_user (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default 'Rama',
  email       text not null,
  auth_method text not null default 'magic_link',
  joined_at   timestamptz not null default now()
);
```

### 4.2 app_settings (global prefs — one row per user)
```sql
create table app_settings (
  owner_id        uuid primary key references app_user(id) on delete cascade,
  pause_all       boolean not null default false,
  resume_date     date,                          -- optional auto-resume for pause_all
  timezone        text not null default 'Asia/Jakarta',
  default_grace   int  not null default 30,       -- minutes
  telegram_chat_id text,                          -- set when bot linked
  telegram_handle text,
  telegram_connected boolean not null default false,
  fail_alerts     boolean not null default true,  -- always-on (UI locks it)
  daily_ping      boolean not null default true,  -- [DECISION] default on
  updated_at      timestamptz not null default now()
);
```
> Storage usage (`storage.used/total` in the mock) is **derived** at read time (sum of asset bytes / plan limit), not stored — see §8.

### 4.3 channel (one IG Business account; max 4)
```sql
create table channel (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references app_user(id) on delete cascade,
  slug            text not null,                 -- 'mahakan' (stable human key)
  name            text not null,                 -- 'Mahakan Coffee'
  handle          text not null,                 -- '@mahakan.coffee'
  avatar_emoji    text,                          -- identity (design fills visuals)
  color_token     text,                          -- brand color key (design-defined)
  ig_user_id      text,                          -- Instagram Professional user id (Instagram Login)
  access_token    text,                          -- ENCRYPTED long-lived token (see TSD)
  token_status    channel_status not null default 'needs_reconnect',
  token_expires_at timestamptz,
  last_refresh_at timestamptz,
  followers       int,                           -- cached from IG (display only)
  paused          boolean not null default false,
  resume_date     date,                          -- per-channel auto-resume
  archived_at     timestamptz,                   -- soft delete / remove brand
  created_at      timestamptz not null default now(),
  unique (owner_id, slug)
);
-- enforce max 4 active channels per owner via a trigger or app check (see TSD).
```

### 4.4 recurring_rule
```sql
create table recurring_rule (
  id            uuid primary key default gen_random_uuid(),
  channel_id    uuid not null references channel(id) on delete cascade,
  name          text not null,                   -- 'Jam buka'
  mode          rule_mode not null,              -- 'schedule' | 'pool'
  active        boolean not null default true,
  cadence_type  cadence_type not null,           -- 'daily' | 'every_n_days' | 'weekdays'
  interval_days int,                             -- for 'every_n_days' (e.g. 2,3)
  weekdays      int[],                           -- for 'weekdays' (0=Sun..6=Sat) e.g. {6,0} = Sat,Sun
  post_time     time,                            -- pool mode: single time (WIB), e.g. 16:30
  weekday_time  time,                            -- schedule mode: weekday post time, e.g. 14:00
  weekend_time  time,                            -- schedule mode: weekend post time, e.g. 09:00
  grace_minutes int not null default 30,
  end_date      date,                            -- [P2] campaign-duration auto-deactivate
  archived_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index on recurring_rule (channel_id) where archived_at is null;
```
> Cadence mapping from the mock strings: `"Setiap hari"`→`daily`; `"Setiap 2 hari"`→`every_n_days, interval_days=2`; `"Sab, Min"`/`"Sen, Rab, Jum"`→`weekdays, weekdays={...}`.

### 4.5 pool + pool_image (the shuffle cycle lives here)
```sql
create table pool (
  id              uuid primary key default gen_random_uuid(),
  rule_id         uuid not null references recurring_rule(id) on delete cascade,
  role            pool_role not null,            -- 'single' | 'weekday' | 'weekend'
  cycle_started_at timestamptz not null default now(),  -- when current no-repeat cycle began
  unique (rule_id, role)
);

create table pool_image (
  id            uuid primary key default gen_random_uuid(),
  pool_id       uuid not null references pool(id) on delete cascade,
  storage_path  text not null,                   -- Supabase Storage object path
  position      int  not null default 0,         -- display order (reorder = nice-to-have)
  used_in_cycle boolean not null default false,  -- ← no-repeat shuffle flag
  -- media validation (set on upload; see TSD)
  width         int,
  height        int,
  aspect_ok     boolean not null default false,  -- ~9:16
  format        text,                            -- 'jpeg' | 'png'
  bytes         int,
  created_at    timestamptz not null default now()
);
create index on pool_image (pool_id) where used_in_cycle = false;  -- fast "unused remainder" pick
```
> **No-repeat shuffle:** pick uniformly from `pool_image where pool_id=? and used_in_cycle=false`; mark chosen `used_in_cycle=true`; when none remain, reset all to false and bump `cycle_started_at`. The mock's `cycle:{used,total}` = `count(used_in_cycle=true)` / `count(*)`.

### 4.6 post_run (state machine) + post_attempt
```sql
create table post_run (
  id            uuid primary key default gen_random_uuid(),
  channel_id    uuid not null references channel(id) on delete cascade,
  rule_id       uuid references recurring_rule(id) on delete set null,   -- null for [P2] one-offs
  scheduled_post_id uuid,                          -- [P2] FK to scheduled_post (one-off)
  pool_role     pool_role,                          -- which pool it drew from (schedule)
  image_id      uuid references pool_image(id) on delete set null,
  status        run_status not null default 'pending',
  trigger       run_trigger not null default 'scheduled',
  scheduled_at  timestamptz not null,               -- the intended fire time (UTC)
  published_at  timestamptz,
  ig_media_id   text,                               -- returned by Meta on publish
  permalink     text,                               -- instagram.com/stories/...
  fail_reason   text,
  attempt_count int not null default 0,
  -- idempotency: a unique claim key prevents double-posts (see TSD)
  claim_key     text unique,                        -- e.g. rule_id||scheduled_at
  created_at    timestamptz not null default now()
);
create index on post_run (channel_id, created_at desc);   -- activity log
create index on post_run (scheduled_at) where status = 'pending';
create index on post_run (rule_id, scheduled_at desc);     -- per-rule history / runs7

create table post_attempt (
  id        uuid primary key default gen_random_uuid(),
  run_id    uuid not null references post_run(id) on delete cascade,
  at        timestamptz not null default now(),
  outcome   text not null,           -- 'Media divalidasi (9:16)', 'Dipublikasikan ✓', ...
  is_fail   boolean not null default false
);
create index on post_attempt (run_id, at);
```
**State machine:** `pending → publishing → published | failed | skipped`. The atomic claim (`pending→publishing` in one conditional `update ... where status='pending'`) + the unique `claim_key` guarantee no double-post under retries/overlap. `attempts` array in the mock = rows in `post_attempt`.

### 4.7 day_override (skip / swap a specific date)
```sql
create table day_override (
  id         uuid primary key default gen_random_uuid(),
  rule_id    uuid not null references recurring_rule(id) on delete cascade,
  on_date    date not null,                       -- WIB calendar date
  type       override_type not null,              -- 'skip' | 'swap'
  swap_image_id uuid references pool_image(id) on delete set null,  -- required when 'swap'
  created_at timestamptz not null default now(),
  unique (rule_id, on_date)
);
```

### 4.8 notification (in-app mirror of alerts)
```sql
create table notification (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references app_user(id) on delete cascade,
  channel_id uuid references channel(id) on delete set null,
  type       notif_type not null,                 -- 'error' | 'warn' | 'success'
  title      text not null,
  body       text not null,
  run_id     uuid references post_run(id) on delete set null,  -- deep-link source
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index on notification (owner_id, read, created_at desc);
```

---

## 5. Expansion tables [P2]

### 5.1 media_asset (shared library)
```sql
create table media_asset (
  id           uuid primary key default gen_random_uuid(),
  channel_id   uuid not null references channel(id) on delete cascade,
  storage_path text not null,
  tag          text,                              -- 'Menu','Promo','Event',...
  width int, height int, aspect_ok boolean, format text, bytes int,
  created_at   timestamptz not null default now()
);
create index on media_asset (channel_id, tag);
```
> "usage" in the library mock (which rule/post uses an asset) is **derived** by looking up references, not stored.

### 5.2 scheduled_post (one-off) + media
```sql
create table scheduled_post (
  id            uuid primary key default gen_random_uuid(),
  channel_id    uuid not null references channel(id) on delete cascade,
  post_type     post_type not null,               -- 'story' | 'feed'
  caption       text,                              -- feed only
  first_comment text,                              -- feed only (hashtags), auto-posted after
  scheduled_at  timestamptz,                       -- null while draft
  status        sched_status not null default 'draft',
  campaign_id   uuid references campaign(id) on delete set null,
  created_at    timestamptz not null default now()
);
create table scheduled_post_media (
  post_id   uuid not null references scheduled_post(id) on delete cascade,
  asset_id  uuid not null references media_asset(id) on delete restrict,
  position  int not null default 0,               -- carousel order (feed up to 10)
  primary key (post_id, position)
);
create index on scheduled_post (channel_id, scheduled_at);
```

### 5.3 campaign (tags / grouping)
```sql
create table campaign (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references app_user(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);
```

---

## 6. Derived / computed (NOT stored — compute in queries or SQL views)

The frontend mock stores several convenience fields that should be **computed**, not persisted, to avoid drift:

| Mock field | Source of truth |
|---|---|
| `rule.cycle {used,total}` | `count(pool_image.used_in_cycle=true)` / `count(*)` for the rule's pool(s) |
| `rule.nextRun` | computed from `cadence_*` + `post_time`/`weekday_time`/`weekend_time` + `now()` (WIB), honoring pause/active/overrides |
| `rule.todayStatus` | today's `post_run.status`, or `Paused`/`Inactive` from channel/rule flags |
| `rule.runs7` | last 7 days of `post_run` for the rule (published=1 else 0) |
| `channel.followers` | cached IG value (refresh occasionally; display only) |
| `settings.storage {used,total}` | `sum(pool_image.bytes)+sum(media_asset.bytes)` vs plan limit |
| library `usage` | reverse-lookup of `pool_image`/`scheduled_post_media` references |

Recommended SQL views: `v_rule_summary` (rule + cycle + next/today/runs7), `v_activity` (post_run + channel + rule names + attempts), `v_storage`.

---

## 7. Row-Level Security (RLS)

Single user today, but enable RLS everywhere as hygiene + future-proofing. Every table carries (directly or via FK) an `owner_id`; policies restrict to the authenticated owner. The **service role** (used only by the Edge Function worker + trusted server routes) bypasses RLS to read tokens and write runs.

```sql
alter table channel enable row level security;
create policy owner_rw on channel
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- child tables (recurring_rule, pool, pool_image, post_run, ...) check ownership
-- via their parent channel/rule, e.g.:
alter table recurring_rule enable row level security;
create policy owner_rw on recurring_rule for all
  using (exists (select 1 from channel c where c.id = channel_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from channel c where c.id = channel_id and c.owner_id = auth.uid()));
-- ... repeat the pattern for pool, pool_image, post_run, post_attempt, day_override,
--     notification, media_asset, scheduled_post(_media), campaign.
```
> Tokens (`channel.access_token`) are never selectable by the client role — keep them out of any client-exposed view; only the service role reads them (see TSD for encryption).

---

## 8. Indexing & performance notes

- Scheduler query (the hot path): `post_run (scheduled_at) where status='pending'` + per-rule next-run computation; keep rule/pool reads cheap.
- Activity log: `post_run (channel_id, created_at desc)`.
- Shuffle pick: partial index `pool_image (pool_id) where used_in_cycle=false`.
- Notifications: `notification (owner_id, read, created_at desc)`.
- Volume is tiny (one operator, 4 channels, a few posts/day) — these indexes are ample; no partitioning needed.

---

## 9. Frontend (mockdata) → schema mapping

Wiring guide — replace each `window.MOCK.*` shape with these tables (camelCase JS ↔ snake_case SQL):

| Mock (`mockdata.jsx`) | Table(s) | Notes |
|---|---|---|
| `CHANNELS[]` (id, brand, handle, status, tokenExpires, lastRefresh, paused, resumeDate, followers) | `channel` | `status`→`token_status`; `tokenExpires`→`token_expires_at`; `lastRefresh`→`last_refresh_at` |
| `RULES[]` (ch, name, mode, active, cadence, time, grace, pools, weekdayTime, weekendTime, cycle, nextRun, todayStatus, lastImg, runs7, failReason) | `recurring_rule` + `pool` + `pool_image` | `cadence`→`cadence_type`(+`interval_days`/`weekdays`); `pools{weekday,weekend}`→two `pool` rows; `cycle`,`nextRun`,`todayStatus`,`runs7`→**derived** (§6) |
| `RUNS[]` (ch, rule, status, trigger, sched, actual, img, pool, link, fail, attempts[]) | `post_run` + `post_attempt` | `sched`→`scheduled_at`; `actual`→`published_at`; `link`→`permalink`; `attempts[]`→`post_attempt` rows |
| `NOTIFS[]` (type, ch, title, body, time, read, runId) | `notification` | `time`→`created_at`; `runId`→`run_id` |
| `SETTINGS` (pauseAll, resumeDate, timezone, defaultGrace, telegram, failAlerts, dailyPing, storage) | `app_settings` (+ derived storage) | `storage`→derived (§6) |
| `PROFILE` (name, email, method, joined) | `app_user` | |
| `ONBOARDING[]` | *(client-side checklist; or a small `onboarding_step` table if you want it persisted)* | derive `done` from real state (channels connected, telegram_connected) |
| `composer` (type, media[], caption, firstComment) [P2] | `scheduled_post` + `scheduled_post_media` | `media[]`→ordered carousel rows |
| `library` (tag, usage) [P2] | `media_asset` | `usage`→derived |
| `calendar ONEOFFS[]` (day, ch, type, title, time, status) [P2] | `scheduled_post` | calendar = `scheduled_post` ∪ computed recurring runs |

---

## 10. Open items (carry from PRD/design.md)

- **[DECISION]** On brand remove/disconnect: set `channel.archived_at` and **disable** its rules (recommended; `recurring_rule.active=false`) vs cascade-delete. Schema supports either; default = soft-archive.
- **[DECISION]** `daily_ping` default — set `true` here (recommended); flip if desired.
- **[VERIFY]** Meta Dev-Mode sustainability (Spike 1) — doesn't change schema, but gates go-live.

---

*Next docs: **TSD** (engine, Meta OAuth + token refresh, publish pipeline + idempotency, pg_cron schedules, shuffle algorithm, WIB↔UTC, alerts) → **FSD** (per-view behavior mapped to the Claude Design screens) → **Meta Setup Runbook**.*
