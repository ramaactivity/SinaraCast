-- Brand workspaces: a BRAND is a business that owns several social ACCOUNTS
-- (channels). e.g. "Mahakan Coffee" owns an Instagram account + a TikTok account.
-- Until now `channel` was flat (each account stood alone). This adds the grouping
-- so the planner can be a per-brand workspace spanning the brand's accounts.
-- Additive + backfilled: every existing account gets its own brand, so nothing breaks.

create table if not exists brand (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references app_user(id) on delete cascade,
  name         text not null,
  avatar_emoji text,
  color_token  text,
  created_at   timestamptz not null default now()
);
create index if not exists brand_owner_idx on brand (owner_id);

alter table brand enable row level security;
drop policy if exists owner_rw on brand;
create policy owner_rw on brand for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- each account belongs to a brand (nullable; set null if the brand is removed).
alter table channel add column if not exists brand_id uuid references brand(id) on delete set null;
create index if not exists channel_brand_idx on channel (brand_id);

-- Backfill: one brand per existing account (named after the account), then assign.
do $$
declare c record; bid uuid;
begin
  for c in select id, owner_id, name, color_token, avatar_emoji from channel where brand_id is null loop
    insert into brand (owner_id, name, color_token, avatar_emoji)
      values (c.owner_id, c.name, c.color_token, c.avatar_emoji) returning id into bid;
    update channel set brand_id = bid where id = c.id;
  end loop;
end $$;

-- content_plan now belongs to a BRAND (the workspace). channel_id becomes optional:
-- it's the specific connected account a plan targets (e.g. the IG account for
-- auto-publish); plan-only platforms (TikTok/YouTube/… without a linked account) leave it null.
alter table content_plan add column if not exists brand_id uuid references brand(id) on delete cascade;
alter table content_plan alter column channel_id drop not null;
create index if not exists content_plan_brand_idx on content_plan (brand_id, planned_date);
