-- Sampul Reels: pilih frame dari videonya (detik) atau unggah gambar sampul sendiri.
-- cover_offset_ms → dikirim ke Instagram sebagai thumb_offset (milidetik).
-- cover_path      → file gambar sampul di storage, dikirim sebagai cover_url.
alter table scheduled_post add column if not exists cover_offset_ms integer;
alter table scheduled_post add column if not exists cover_path text;
