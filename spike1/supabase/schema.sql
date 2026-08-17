-- SinaraCast — database schema (Supabase / PostgreSQL 15)
-- Generated from schema.md v1.1 (§3 enums, §4 core P1, §5 expansion P2, §7 RLS).
-- Safe to run once on a fresh project. Idempotent where practical.

create extension if not exists pgcrypto;

-- ============================================================
-- 3. Enum types
-- ============================================================
do $$ begin
  create type rule_mode      as enum ('schedule','pool');
exception when duplicate_object then null; end $$;
do $$ begin
  create type pool_role      as enum ('single','weekday','weekend','special');
exception when duplicate_object then null; end $$;
do $$ begin
  create type cadence_type   as enum ('daily','every_n_days','weekdays');
exception when duplicate_object then null; end $$;
do $$ begin
  create type channel_status as enum ('connected','expiring','needs_reconnect');
exception when duplicate_object then null; end $$;
do $$ begin
  create type run_status     as enum ('pending','publishing','published','failed','skipped');
exception when duplicate_object then null; end $$;
do $$ begin
  create type run_trigger    as enum ('scheduled','manual','retry','swap');
exception when duplicate_object then null; end $$;
do $$ begin
  create type override_type  as enum ('skip','swap');
exception when duplicate_object then null; end $$;
do $$ begin
  create type notif_type     as enum ('error','warn','success','info');
exception when duplicate_object then null; end $$;
do $$ begin
  create type post_type      as enum ('story','feed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type sched_status   as enum ('draft','scheduled','publishing','published','failed','canceled');
exception when duplicate_object then null; end $$;

-- ============================================================
-- 4. Core tables (P1)
-- ============================================================
create table if not exists app_user (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default 'Rama',
  email       text not null,
  auth_method text not null default 'magic_link',
  joined_at   timestamptz not null default now()
);

create table if not exists app_settings (
  owner_id           uuid primary key references app_user(id) on delete cascade,
  pause_all          boolean not null default false,
  resume_date        date,
  timezone           text not null default 'Asia/Jakarta',
  default_grace      int  not null default 30,
  telegram_chat_id   text,
  telegram_handle    text,
  telegram_connected boolean not null default false,
  fail_alerts        boolean not null default true,
  daily_ping         boolean not null default true,
  special_sync_on    date,  -- guard: special-day API sync ran this WIB day
  special_reminder_on date, -- guard: special-day H-7/H-1 reminders ran this WIB day
  special_reminders  boolean not null default true, -- H-7/H-1 reminders on/off (Pengaturan)
  updated_at         timestamptz not null default now()
);

create table if not exists channel (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references app_user(id) on delete cascade,
  slug             text not null,
  name             text not null,
  handle           text not null,
  avatar_emoji     text,
  avatar_url       text,
  color_token      text,
  ig_user_id       text,
  access_token     text,
  token_status     channel_status not null default 'needs_reconnect',
  token_expires_at timestamptz,
  last_refresh_at  timestamptz,
  followers        int,
  paused           boolean not null default false,
  resume_date      date,
  archived_at      timestamptz,
  created_at       timestamptz not null default now(),
  unique (owner_id, slug)
);

create table if not exists recurring_rule (
  id            uuid primary key default gen_random_uuid(),
  channel_id    uuid not null references channel(id) on delete cascade,
  name          text not null,
  mode          rule_mode not null,
  active        boolean not null default true,
  cadence_type  cadence_type not null,
  interval_days int,
  weekdays      int[],
  post_time     time,        -- legacy single time; kept as fallback for *_times arrays
  weekday_time  time,
  weekend_time  time,
  post_times    time[],      -- beberapa jam posting per hari (pool mode)
  weekday_times time[],      -- beberapa jam posting per hari kerja (schedule mode)
  weekend_times time[],      -- beberapa jam posting per akhir pekan (schedule mode)
  grace_minutes int not null default 30,
  special_behavior text not null default 'normal', -- 'normal' | 'skip' | 'special_pool' on special days
  start_date    date,        -- masa berlaku: mulai jalan (NULL = langsung)
  end_date      date,        -- masa berlaku: berhenti otomatis (NULL = selamanya)
  archived_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists recurring_rule_channel_idx on recurring_rule (channel_id) where archived_at is null;

create table if not exists pool (
  id               uuid primary key default gen_random_uuid(),
  rule_id          uuid not null references recurring_rule(id) on delete cascade,
  role             pool_role not null,
  story_count      int not null default 1 check (story_count between 1 and 5),
  cycle_started_at timestamptz not null default now(),
  unique (rule_id, role)
);

create table if not exists pool_image (
  id            uuid primary key default gen_random_uuid(),
  pool_id       uuid not null references pool(id) on delete cascade,
  storage_path  text not null,
  position      int  not null default 0,
  used_in_cycle boolean not null default false,
  width         int,
  height        int,
  aspect_ok     boolean not null default false,
  format        text,
  bytes         int,
  created_at    timestamptz not null default now()
);
create index if not exists pool_image_unused_idx on pool_image (pool_id) where used_in_cycle = false;

create table if not exists post_run (
  id                uuid primary key default gen_random_uuid(),
  channel_id        uuid not null references channel(id) on delete cascade,
  rule_id           uuid references recurring_rule(id) on delete set null,
  scheduled_post_id uuid,
  pool_role         pool_role,
  image_id          uuid references pool_image(id) on delete set null,
  status            run_status not null default 'pending',
  trigger           run_trigger not null default 'scheduled',
  scheduled_at      timestamptz not null,
  published_at      timestamptz,
  ig_media_id       text,
  permalink         text,
  fail_reason       text,
  attempt_count     int not null default 0,
  claim_key         text unique,
  m_views           int,  -- auto-pulled IG insights (story: frozen at ~24h; feed/reels: refreshed daily ≤30d)
  m_reach           int,
  m_likes           int,
  m_comments        int,
  m_shares          int,
  m_saves           int,
  m_replies         int,  -- story-only (DM replies)
  metrics_pulled_at timestamptz,
  metrics_final     boolean not null default false,
  created_at        timestamptz not null default now()
);
create index if not exists post_run_metrics_due_idx on post_run (published_at desc)
  where status = 'published' and metrics_final = false;
create index if not exists post_run_activity_idx on post_run (channel_id, created_at desc);
create index if not exists post_run_pending_idx  on post_run (scheduled_at) where status = 'pending';
create index if not exists post_run_rule_idx      on post_run (rule_id, scheduled_at desc);

create table if not exists post_attempt (
  id      uuid primary key default gen_random_uuid(),
  run_id  uuid not null references post_run(id) on delete cascade,
  at      timestamptz not null default now(),
  outcome text not null,
  is_fail boolean not null default false
);
create index if not exists post_attempt_run_idx on post_attempt (run_id, at);

create table if not exists day_override (
  id            uuid primary key default gen_random_uuid(),
  rule_id       uuid not null references recurring_rule(id) on delete cascade,
  on_date       date not null,
  type          override_type not null,
  swap_image_id uuid references pool_image(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (rule_id, on_date)
);

-- Hari Spesial: per-owner calendar of national/religious/custom dates. API-synced
-- rows never overwrite rows the user touched (user_touched=true is permanent).
create table if not exists special_day (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references app_user(id) on delete cascade,
  on_date      date not null,
  name         text not null,
  category     text not null default 'national',   -- 'national' | 'religious' | 'custom'
  is_active    boolean not null default true,
  source       text not null default 'manual',     -- 'api' | 'seed' | 'manual'
  user_touched boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (owner_id, on_date, name)
);
create index if not exists special_day_owner_date_idx on special_day (owner_id, on_date);

create table if not exists notification (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references app_user(id) on delete cascade,
  channel_id uuid references channel(id) on delete set null,
  type       notif_type not null,
  title      text not null,
  body       text not null,
  run_id     uuid references post_run(id) on delete set null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notification_owner_idx on notification (owner_id, read, created_at desc);

-- ============================================================
-- 5. Expansion tables [P2]
-- ============================================================
create table if not exists media_asset (
  id           uuid primary key default gen_random_uuid(),
  channel_id   uuid not null references channel(id) on delete cascade,
  storage_path text not null,
  tag          text,
  width int, height int, aspect_ok boolean, format text, bytes int,
  created_at   timestamptz not null default now()
);
create index if not exists media_asset_channel_idx on media_asset (channel_id, tag);

create table if not exists campaign (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references app_user(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create table if not exists scheduled_post (
  id            uuid primary key default gen_random_uuid(),
  channel_id    uuid not null references channel(id) on delete cascade,
  post_type     post_type not null,
  caption       text,
  first_comment text,
  scheduled_at  timestamptz,
  status        sched_status not null default 'draft',
  campaign_id   uuid references campaign(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists scheduled_post_channel_idx on scheduled_post (channel_id, scheduled_at);

create table if not exists scheduled_post_media (
  post_id   uuid not null references scheduled_post(id) on delete cascade,
  asset_id  uuid not null references media_asset(id) on delete restrict,
  position  int not null default 0,
  primary key (post_id, position)
);

-- ============================================================
-- 7. Row-Level Security
-- service_role bypasses RLS automatically (used by the Edge worker).
-- ============================================================
alter table app_user             enable row level security;
alter table app_settings         enable row level security;
alter table channel              enable row level security;
alter table recurring_rule       enable row level security;
alter table pool                 enable row level security;
alter table pool_image           enable row level security;
alter table post_run             enable row level security;
alter table post_attempt         enable row level security;
alter table day_override         enable row level security;
alter table notification         enable row level security;
alter table special_day          enable row level security;
alter table media_asset          enable row level security;
alter table campaign             enable row level security;
alter table scheduled_post       enable row level security;
alter table scheduled_post_media enable row level security;

-- owner-direct tables
drop policy if exists owner_rw on app_user;
create policy owner_rw on app_user for all
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists owner_rw on app_settings;
create policy owner_rw on app_settings for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists owner_rw on channel;
create policy owner_rw on channel for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists owner_rw on notification;
create policy owner_rw on notification for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists owner_rw on special_day;
create policy owner_rw on special_day for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists owner_rw on campaign;
create policy owner_rw on campaign for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- via channel
drop policy if exists owner_rw on recurring_rule;
create policy owner_rw on recurring_rule for all
  using (exists (select 1 from channel c where c.id = channel_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from channel c where c.id = channel_id and c.owner_id = auth.uid()));

drop policy if exists owner_rw on post_run;
create policy owner_rw on post_run for all
  using (exists (select 1 from channel c where c.id = channel_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from channel c where c.id = channel_id and c.owner_id = auth.uid()));

drop policy if exists owner_rw on media_asset;
create policy owner_rw on media_asset for all
  using (exists (select 1 from channel c where c.id = channel_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from channel c where c.id = channel_id and c.owner_id = auth.uid()));

drop policy if exists owner_rw on scheduled_post;
create policy owner_rw on scheduled_post for all
  using (exists (select 1 from channel c where c.id = channel_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from channel c where c.id = channel_id and c.owner_id = auth.uid()));

-- via rule -> channel
drop policy if exists owner_rw on pool;
create policy owner_rw on pool for all
  using (exists (select 1 from recurring_rule r join channel c on c.id = r.channel_id
                 where r.id = rule_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from recurring_rule r join channel c on c.id = r.channel_id
                 where r.id = rule_id and c.owner_id = auth.uid()));

drop policy if exists owner_rw on day_override;
create policy owner_rw on day_override for all
  using (exists (select 1 from recurring_rule r join channel c on c.id = r.channel_id
                 where r.id = rule_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from recurring_rule r join channel c on c.id = r.channel_id
                 where r.id = rule_id and c.owner_id = auth.uid()));

-- via pool -> rule -> channel
drop policy if exists owner_rw on pool_image;
create policy owner_rw on pool_image for all
  using (exists (select 1 from pool p join recurring_rule r on r.id = p.rule_id
                 join channel c on c.id = r.channel_id
                 where p.id = pool_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from pool p join recurring_rule r on r.id = p.rule_id
                 join channel c on c.id = r.channel_id
                 where p.id = pool_id and c.owner_id = auth.uid()));

-- via post_run -> channel
drop policy if exists owner_rw on post_attempt;
create policy owner_rw on post_attempt for all
  using (exists (select 1 from post_run pr join channel c on c.id = pr.channel_id
                 where pr.id = run_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from post_run pr join channel c on c.id = pr.channel_id
                 where pr.id = run_id and c.owner_id = auth.uid()));

-- via scheduled_post -> channel
drop policy if exists owner_rw on scheduled_post_media;
create policy owner_rw on scheduled_post_media for all
  using (exists (select 1 from scheduled_post sp join channel c on c.id = sp.channel_id
                 where sp.id = post_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from scheduled_post sp join channel c on c.id = sp.channel_id
                 where sp.id = post_id and c.owner_id = auth.uid()));

-- ============================================================
-- Auth: auto-create app_user + app_settings profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.app_user (id, email, name)
    values (new.id, coalesce(new.email, ''), 'Rama')
    on conflict (id) do nothing;
  insert into public.app_settings (owner_id)
    values (new.id)
    on conflict (owner_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
