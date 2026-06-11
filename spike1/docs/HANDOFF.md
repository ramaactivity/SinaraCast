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

2. **Story video (one-off)** — postingan Story sekarang bisa berupa gambar ATAU video (9:16, ≤60 dtk, ≤50MB). publisher pakai `video_url` untuk video.
3. **"Lewati hari ini" & "Ganti gambar" sekarang BENERAN** (FR-9) — dulu cuma di layar, engine tetap posting. Sekarang tersimpan ke `day_override` dan cron menghormatinya (skip = tidak posting hari itu; swap = pakai gambar pilihan). Tombol "Lewati" berubah jadi "Batalkan" saat aktif.
4. **Hemat penyimpanan** — file video one-off (Reels & Story video) otomatis dihapus dari storage setelah berhasil terbit (postingan sudah ada di IG). Menjaga kuota free-tier 50MB.
5. **Peringatan jam bentrok** (FR-21) — editor jadwal memperingatkan kalau jamnya sama dengan jadwal lain di akun yang sama.

## B. PERLU KAMU TES / LAKUKAN MANUAL (lanjutan)
3. **[TES] Story video** — Buat Postingan → Story → unggah video 9:16 pendek → jadwalkan → cek terbit sebagai Story video.
4. **[TES] Lewati/Ganti gambar hari ini** — di Jadwal Otomatis, panel kanan "Khusus hari ini": klik "Lewati" lalu cek jadwal itu TIDAK terbit hari ini (dan muncul "Dilewati" di Riwayat). Klik "Ganti gambar" → pilih → cek gambar itu yang terbit.

NOTE umum: semua publish video (Reels/Story video) belum diuji end-to-end di akun nyata — itu yang paling penting kamu tes.

6. **Story video di JADWAL OTOMATIS (recurring)** — pool jadwal sekarang bisa diisi video 9:16 (≤60 dtk, ≤50MB), bukan cuma gambar. Engine deteksi otomatis (video → `video_url`). Jadi satu jadwal bisa campur gambar & video, tetap diacak.
7. **Pilih akun di "Buat Postingan"** — ada dropdown akun (kalau punya >1 akun) biar bisa posting ke akun mana saja tanpa ganti via sidebar.

## B. PERLU KAMU TES (lanjutan)
5. **[TES] Story video recurring** — Buat/Ubah jadwal → unggah video 9:16 pendek ke pool → Post now/test → cek terbit sebagai Story video.
6. **[PENTING] Verifikasi semua publish VIDEO (Reels, Story video one-off & recurring) di akun nyata.** Ini yang paling krusial — kode sudah jalan & build hijau, tapi belum pernah benar-benar mem-publish video ke Instagram. Risiko utama: (a) izin Meta untuk video, (b) timeout transcoding kalau video panjang/berat (pakai video pendek dulu). Kalau ada error, screenshot pesannya.

## Audit & hardening (sudah saya lakukan)
Saya audit pipeline video sendiri dan perbaiki bug nyata yang ditemukan:
- **Anti "tertahan selamanya":** kalau publish video kepotong batas 60 dtk Vercel, postingan dulu bisa nyangkut di status "publishing" selamanya. Sekarang ada penyapu otomatis: yang nyangkut >10 menit ditandai gagal + kamu dapat alert (TIDAK di-retry otomatis, biar tidak dobel-posting).
- **Anti rebutan waktu:** kalau satu video makan waktu lama, item lain di menit yang sama dulu bisa terlewat. Sekarang ada batas waktu ~45 dtk; sisanya jalan menit berikutnya.
- Poll transcoding dikecilkan biar muat di 60 dtk.
- ⚠️ **Caveat dobel-posting:** kalau nanti ada postingan "tertahan" lalu kamu paksa reset manual ke "scheduled", ada risiko kecil terbit dua kali (kalau IG ternyata sudah memposting sebelum timeout). Jadi: kalau ada yang tertahan, lebih aman buat ulang daripada reset manual.

## Tambahan (sesi lanjutan, sambil kamu makan siang)
- ✅ **Telegram TERVERIFIKASI BERFUNGSI** — saya kirim pesan tes nyata ke chat-mu (@humpreyyy2), terkirim sukses. Jalur pemberitahuan beneran jalan. (Cek Telegram-mu, ada pesan tes dariku.)
- **Tombol "Kirim tes"** ditambah di Settings & Manajemen Akun (kartu Telegram) — kamu bisa kirim pesan tes kapan saja untuk memastikan alert sampai.
- **Perf:** `loadAll()` dulu ~10 query berurutan tiap login/reload, sekarang paralel (1 batch). Loading lebih cepat.

## Catatan teknis (untukku saat kembali)
- Reels poll transcoding dibatasi ~50 dtk (budget cron 60 dtk). Video panjang bisa timeout. Solusi nanti: publisher resumable (simpan creation_id, lanjut di tick berikutnya).
- Bucket `pool-images` kini juga simpan video (maks 50MB free-tier). File video one-off dihapus otomatis setelah terbit; file video di pool recurring TIDAK dihapus (dipakai berulang).
