-- Bank Ide & Referensi + kolom script pada rencana konten.
--
-- 1) content_plan.script — naskah/script hasil AI (Reels/video: hook-isi-CTA per
--    adegan; carousel: outline per slide). Terpisah dari `notes` (catatan produksi).
alter table content_plan add column if not exists script text;

-- 2) idea_bank — tempat menaruh ide, inspirasi, contoh, referensi. Jadi "bahan
--    bakar" yang bisa dikembangkan AI menjadi rencana konten.
--    kind: idea | inspiration | reference | example
create table if not exists idea_bank (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references app_user(id) on delete cascade,
  brand_id   uuid references brand(id) on delete set null,   -- null = umum (semua brand)
  channel_id uuid references channel(id) on delete set null, -- opsional: akun tertentu
  kind       text not null default 'idea',
  title      text,
  note       text,
  url        text,        -- link referensi/inspirasi
  image_url  text,        -- gambar contoh (opsional)
  tags       text[],
  source     text,        -- dari mana (mis. "Instagram @kompetitor", "TikTok")
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idea_bank_owner_idx on idea_bank (owner_id, created_at desc);
create index if not exists idea_bank_brand_idx on idea_bank (brand_id) where archived_at is null;

alter table idea_bank enable row level security;
drop policy if exists owner_rw on idea_bank;
create policy owner_rw on idea_bank for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- keep updated_at fresh
create or replace function public.touch_idea_bank_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists idea_bank_set_updated_at on idea_bank;
create trigger idea_bank_set_updated_at
  before update on idea_bank
  for each row execute function public.touch_idea_bank_updated_at();
