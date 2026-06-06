-- Follower trend: one row per channel per WIB day, so the Ringkasan view can show
-- follower growth over time. Solo-maintainable: the daily snapshot reuses the
-- existing IG token (followers_count is already read at connect, no new scope).

create table if not exists follower_snapshot (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid not null references channel(id) on delete cascade,
  snap_date   date not null,                 -- WIB calendar day
  followers   int,
  captured_at timestamptz not null default now(),
  unique (channel_id, snap_date)
);
create index if not exists follower_snapshot_ch_idx on follower_snapshot (channel_id, snap_date);

alter table follower_snapshot enable row level security;
drop policy if exists owner_rw on follower_snapshot;
create policy owner_rw on follower_snapshot for all
  using (exists (select 1 from channel c where c.id = channel_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from channel c where c.id = channel_id and c.owner_id = auth.uid()));
