-- Papan Visual pada rencana konten:
-- 1) reference_images — moodboard: daftar URL gambar acuan (jsonb array of string).
-- 2) storyboard — daftar frame/adegan (jsonb array of {scene, visual, voiceover, duration}).
alter table content_plan add column if not exists reference_images jsonb;
alter table content_plan add column if not exists storyboard jsonb;
