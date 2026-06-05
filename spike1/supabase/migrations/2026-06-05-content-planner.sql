-- Content Planner (schema.md v1.2 §11) — additive, references existing tables
-- (app_user, channel, scheduled_post, recurring_rule, post_run, campaign).
-- Nothing here touches the live Instagram/recurring engine; a content_plan is a
-- planning layer that *optionally* links to a scheduled_post/rule for auto-fill.
--
-- v1: single-operator, multi-brand. Lean status idea→ready→posted (extra stages
-- opt-in). Hybrid: IG entries can auto-publish + auto-fill; other platforms are
-- plan-only ("Auto-publish: Coming soon"). Metrics: manual is the reliable path;
-- IG auto-pull is a later best-effort spike (may need an extra OAuth scope).

-- ============================================================
-- Enums (idempotent, matching schema.sql's do/exception pattern)
-- ============================================================
do $$ begin
  create type content_platform as enum ('instagram','tiktok','youtube','linkedin','twitter','threads','facebook');
exception when duplicate_object then null; end $$;
do $$ begin
  create type content_status   as enum ('idea','draft','review','approved','revision','ready','posted');
exception when duplicate_object then null; end $$;
do $$ begin
  create type content_format   as enum ('story','feed','reels','carousel','video','single_image','thread');
exception when duplicate_object then null; end $$;
do $$ begin
  create type content_goal     as enum ('awareness','engagement','conversion','traffic','retention','other');
exception when duplicate_object then null; end $$;
do $$ begin
  create type plan_source      as enum ('manual','linked_oneoff','linked_rule');
exception when duplicate_object then null; end $$;
do $$ begin
  create type metric_source    as enum ('auto_ig','manual','none');
exception when duplicate_object then null; end $$;

-- ============================================================
-- content_plan — the planner entry
-- ============================================================
create table if not exists content_plan (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references app_user(id) on delete cascade,
  channel_id    uuid not null references channel(id) on delete cascade,   -- brand
  platform      content_platform not null,
  planned_date  date not null,
  planned_time  time,                          -- WIB
  title         text,
  content_type  text,                          -- free in v1 (configurable = FR-51)
  pillar        text,
  format        content_format,
  goal          content_goal,
  hook          text,                          -- cover / hook text
  caption       text,
  notes         text,
  reference_url text,
  brief_url     text,                          -- GDoc
  design_url    text,                          -- Canva/Drive
  status        content_status not null default 'idea',
  -- automation link (hybrid model, IG only in v1)
  source            plan_source not null default 'manual',
  scheduled_post_id uuid references scheduled_post(id) on delete set null,
  recurring_rule_id uuid references recurring_rule(id) on delete set null,
  post_run_id       uuid references post_run(id) on delete set null,      -- the run that fulfilled it
  auto_managed      boolean not null default false,   -- true = status/link/metrics auto-filled
  post_link         text,                              -- auto (IG) or manual
  posted_at         timestamptz,
  -- performance (current snapshot; history table optional later)
  m_views    int, m_likes int, m_comments int, m_shares int, m_saves int, m_reach int,
  metrics_source     metric_source not null default 'none',
  metrics_updated_at timestamptz,
  campaign_id   uuid references campaign(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists content_plan_owner_date_idx   on content_plan (owner_id, planned_date);
create index if not exists content_plan_channel_status_idx on content_plan (channel_id, status);
create index if not exists content_plan_platform_idx      on content_plan (platform);
create index if not exists content_plan_sched_idx         on content_plan (scheduled_post_id) where scheduled_post_id is not null;

-- ============================================================
-- content_metric_snapshot — optional metric history (v1.1+; unused in v1)
-- ============================================================
create table if not exists content_metric_snapshot (
  id uuid primary key default gen_random_uuid(),
  content_plan_id uuid not null references content_plan(id) on delete cascade,
  captured_at timestamptz not null default now(),
  views int, likes int, comments int, shares int, saves int, reach int
);
create index if not exists content_metric_snapshot_plan_idx on content_metric_snapshot (content_plan_id, captured_at);

-- ============================================================
-- RLS — owner-scoped; service-role worker bypasses for auto-fill (schema.md §7)
-- ============================================================
alter table content_plan            enable row level security;
alter table content_metric_snapshot enable row level security;

drop policy if exists owner_rw on content_plan;
create policy owner_rw on content_plan for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists owner_rw on content_metric_snapshot;
create policy owner_rw on content_metric_snapshot for all
  using (exists (select 1 from content_plan cp where cp.id = content_plan_id and cp.owner_id = auth.uid()))
  with check (exists (select 1 from content_plan cp where cp.id = content_plan_id and cp.owner_id = auth.uid()));

-- ============================================================
-- keep updated_at fresh on edits
-- ============================================================
create or replace function public.touch_content_plan_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists content_plan_set_updated_at on content_plan;
create trigger content_plan_set_updated_at
  before update on content_plan
  for each row execute function public.touch_content_plan_updated_at();
