# Deploy — SinaraCast

## Jalur deploy (cara kerja sekarang)

**`git push origin main` → GitHub Actions → Vercel CLI (pakai token).**

Bukan lagi native Git integration Vercel. Setiap push ke `main` menjalankan
workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) yang:

1. `actions/checkout@v4` — ambil source
2. `npm install -g vercel@latest` — pasang Vercel CLI di runner
3. `vercel pull` — ambil setting project (termasuk Root Directory = `spike1`)
4. `rm -rf .git` — **WAJIB**, lihat di bawah
5. `vercel deploy --prod` — upload source, **build dijalankan REMOTE di Vercel**
   (Vercel yang `npm install` + build pakai cache-nya sendiri, apply Root
   Directory `spike1`, dan menyuntik env var saat build seperti native)

Tidak ada `vercel build` lokal. Karena build jalan di infra Vercel, env var
(termasuk yang Sensitive) tersedia otomatis saat build — sisi CI jadi minimal.

### Kenapa `rm -rf .git` wajib

Kalau `.git` masih ada saat `vercel deploy`, CLI ikut melampirkan **commit
author**. Di akun Vercel ini (Hobby, GitHub tidak tertaut, tanpa kolaborator),
Vercel memblokir deployment dengan *"commit email could not be matched to a
GitHub account"*. Menghapus `.git` membuang metadata itu, sehingga deploy
diotorisasi murni oleh **token** (atas nama pemilik token) dan tidak ke-block.
`rm -rf .git` ditaruh **setelah** `vercel pull` (pull menulis ke `.vercel`,
bukan `.git`) dan tidak mengganggu deploy karena CLI memakai
`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` + token, bukan git.

## Kenapa pakai CI token, bukan native Git integration

Satu GitHub account (`ramaactivity`) cuma bisa "login-connect" ke **satu** akun
Vercel dalam satu waktu. Repo ini deploy ke akun Vercel sendiri yang berbeda dari
project lain. Kalau pakai native Git integration, koneksi GitHub saling rebutan
antar-project → koneksi lepas → deploy ke-block. Vercel CLI + token yang
di-scope ke project ini menghindari masalah itu sepenuhnya. Cukup satu secret:
`VERCEL_TOKEN`.

`VERCEL_ORG_ID` dan `VERCEL_PROJECT_ID` di-inline di workflow (bukan rahasia).

## Akun & domain

- **Akun Vercel:** akun khusus project ini (berbeda email dari project lain).
  Org/Team ID: `team_DrIFTCibqzGWz5gnPFEDQ1mi`.
- **Vercel project:** `sinara-cast` (ID `prj_jepDq5u6sM7xHG2LjAm0R54NRyt4`).
- **Root Directory:** `spike1` (di-set di Vercel → Settings → General).
- **Alias domain:** _(isi di sini setelah konfirmasi dari Vercel → Settings →
  Domains, mis. `sinara-cast.vercel.app`)._

## Setup awal (sekali saja)

1. Vercel → akun project INI → Settings → Tokens → buat token, scope ke team
   yang benar, **No Expiration**.
2. GitHub repo → Settings → Secrets and variables → Actions → New repository
   secret, nama **`VERCEL_TOKEN`**, isi token tadi.
3. Push `main` → cek tab Actions hijau.
4. Vercel project → Settings → Git → **Disconnect** native Git integration biar
   tidak dobel-deploy.

## Troubleshooting

- **Actions merah (gagal di step `vercel pull`/`deploy`)** → kemungkinan besar
  `VERCEL_TOKEN` expired atau dicabut, atau salah scope team. Buat token baru,
  update secret `VERCEL_TOKEN`.
- **Deploy dobel** (dua deployment muncul per push) → native Git integration di
  Vercel belum di-disconnect. Vercel → Settings → Git → Disconnect.
- **Dua deploy production barengan** → tidak terjadi: workflow pakai
  `concurrency: vercel-production` dengan `cancel-in-progress`.

## Catatan

- App ada di `spike1/`. Package manager: **npm** (`spike1/package-lock.json`).
  Node **22**.
- Secret/env app tetap di Vercel project (Environment Variables) — `vercel pull`
  yang menariknya saat build. `.env.local` lokal TIDAK di-commit (ter-gitignore).
