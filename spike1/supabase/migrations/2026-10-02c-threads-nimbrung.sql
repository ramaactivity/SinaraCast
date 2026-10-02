-- Bruno "nimbrung" di Threads: membalas postingan orang lain (hasil pencarian).
--
-- threads_kompetitor: username yang TIDAK boleh dibalas Bruno (akun kompetitor).
-- Dikelola Rama di Manajemen Akun → panel Threads; dibaca /api/mcp.
create table if not exists threads_kompetitor (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid(),
  username   text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, username)
);
alter table threads_kompetitor enable row level security;
drop policy if exists owner_rw on threads_kompetitor;
create policy owner_rw on threads_kompetitor for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Audit balasan: siapa yang dibalas dan link postingannya.
alter table ig_comment_action add column if not exists target_username text;
alter table ig_comment_action add column if not exists target_url text;

alter table ig_comment_action drop constraint if exists ig_comment_action_kind_check;
alter table ig_comment_action add constraint ig_comment_action_kind_check
  check (kind in ('reply', 'private_reply', 'threads_post', 'threads_reply', 'threads_reply_luar'));
