-- Jalur komentar Instagram untuk agent Hermes (Bruno) lewat /api/mcp.
--
-- channel.ig_scopes: izin yang benar-benar diberikan saat OAuth (dikirim
-- Instagram di respons tukar token). NULL = disambungkan sebelum kolom ini ada,
-- jadi perlakukan sebagai "belum ada izin komentar" sampai disambung ulang.
alter table channel add column if not exists ig_scopes text[];

-- Log setiap aksi tulis Bruno (balasan publik + private reply). Sekaligus
-- penjaga idempoten: satu komentar hanya bisa dibalas sekali per jenis, dan
-- baris di sini juga dipakai menghitung batas harian.
create table if not exists ig_comment_action (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null,
  channel_id  uuid not null references channel(id) on delete cascade,
  comment_id  text not null,
  kind        text not null check (kind in ('reply', 'private_reply')),
  text        text not null,
  actor       text not null default 'hermes',
  result_id   text,
  at          timestamptz not null default now(),
  unique (channel_id, comment_id, kind)
);
create index if not exists ig_comment_action_day_idx on ig_comment_action (channel_id, kind, at);

alter table ig_comment_action enable row level security;
drop policy if exists owner_read on ig_comment_action;
create policy owner_read on ig_comment_action for select using (owner_id = auth.uid());
