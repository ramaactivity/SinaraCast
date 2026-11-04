# Studio Konten API (`/api/studio`)

Pintu untuk repo **Studio Konten** (`~/Proyek/Studio Konten`) mengirim desain/video yang sudah jadi ke SinaraCast sebagai **draf** atau **postingan terjadwal**. Barisnya sama persis dengan yang dibuat composer (`media_asset` + `scheduled_post` + `scheduled_post_media`), jadi cron, retry, riwayat, dan notifikasi berjalan seperti biasa.

- Auth: `Authorization: Bearer <STUDIO_API_TOKEN>` (env Vercel, sensitive; kosong = semua ditolak). Salinan token ada di `.env.local` Studio Konten sebagai `SINARA_TOKEN`.
- `POST {action:"akun"}` → akun Instagram yang tersambung `{id, handle, name}`.
- `POST {action:"presign", ext}` → URL unggah langsung ke R2 (`studio-konten/<uuid>.<ext>`) + URL publik.
- `POST {action:"buat", post:{channel_id, post_type: story|feed|reels, status: draft|scheduled, scheduled_at?, caption?, first_comment?, media:[{url, format, width?, height?, bytes?}]}}` → validasi `lib/studioApi.js` (feed 1–10 JPG, story 1, reels 1 video, jadwal ≥2 menit ke depan).
- `POST {action:"status", id}` → status postingan.

Klien: `node scripts/sinara.mjs` di repo Studio Konten (default hanya rencana; kirim dengan `--kirim`).
