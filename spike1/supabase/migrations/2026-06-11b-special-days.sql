-- Hari Spesial: managed calendar of Indonesian national/religious/custom dates,
-- per-rule behavior on those dates, and daily-job guards for sync + reminders.
-- Rows synced from the public API never overwrite rows the user touched
-- (deactivated/edited): user_touched=true is permanent protection.
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

alter table special_day enable row level security;
drop policy if exists owner_rw on special_day;
create policy owner_rw on special_day for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- What a rule does when today is a special day: post as usual, skip, or use the
-- rule's 'special' image pool. Default keeps every existing rule unchanged.
alter table recurring_rule add column if not exists special_behavior text not null default 'normal';

-- Self-guards so the cron runs API sync + H-7/H-1 reminders once per WIB day.
alter table app_settings add column if not exists special_sync_on date;
alter table app_settings add column if not exists special_reminder_on date;
