# Handoff — autonomous session (2026-06-06)

Catatan untuk Rama. Berisi (A) apa yang dikerjakan, (B) yang perlu kamu tes/lakukan manual.

## A. Yang sudah dikerjakan & deployed
1. **Modul Reels (one-off video)** — bisa jadwalkan & terbit otomatis.
   - Bucket `pool-images` diperluas: terima `video/mp4`/`video/quicktime`, maks **50 MB** (batas free-tier Supabase). Diterapkan live via `supabase/setup-media-bucket.mjs`.
   - Enum `post_type` ditambah `reels` (migrasi `supabase/migrations/2026-06-06-reels-posttype.sql`, sudah diterapkan).
   - Publisher `publishReelsOneoff` (lib/publishCore.js): `media_type=REELS` + `video_url` + caption + komentar pertama. Poll lebih lama untuk transcoding video.
   - Composer: mode Reels nyata (unggah video, validasi 9:16 + ≤90 dtk + ≤50MB, pratinjau video, caption opsional, jadwal).

## B. PERLU KAMU TES / LAKUKAN MANUAL
1. **[TES] Reels end-to-end** — ini BELUM diverifikasi di akun nyata. Buat Postingan → Reels → unggah video 9:16 pendek (≤30 dtk biar transcoding cepat) → jadwalkan 2 menit ke depan → cek apakah terbit di Instagram + muncul di Riwayat. ⚠️ Risiko: kalau video lama/berat, transcoding bisa >60 dtk dan cron timeout → ditandai gagal. Pakai video pendek dulu.
2. **[CEK] Izin Reels di Meta App** — pastikan scope `instagram_business_content_publish` mengizinkan publish Reels untuk akun (Dev Mode). Kalau gagal dengan error permission, kabari saya.

(Daftar ini akan terus saya tambah selama sesi.)
