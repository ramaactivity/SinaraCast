# App Review Threads: izin pencarian (threads_keyword_search)

Untuk: Rama. Tujuan: Bruno bisa mencari postingan Threads **orang lain** (bukan cuma milik Tetra) lalu ikut
mengobrol di sana. Sebelum review disetujui, `threads_cari` hanya mengembalikan postingan Tetra sendiri dan
memberi peringatan "keyword_search belum disetujui".

Yang lain (posting, baca komentar, balas komentar, balas postingan yang id-nya sudah diketahui) **tidak** butuh
review untuk akun Tetra sendiri.

## Sudah siap di SinaraCast
| Yang diminta Meta | Isi |
|---|---|
| Privacy Policy URL | https://sinara-cast.vercel.app/privacy |
| Terms of Service URL | https://sinara-cast.vercel.app/terms |
| User data deletion | https://sinara-cast.vercel.app/data-deletion |
| Redirect callback | https://sinara-cast.vercel.app/connect/threads/callback |
| App icon (1024×1024) | pakai logo Tetra / SinaraCast |

## Langkah (sekali saja)
1. developers.facebook.com → app **Tetra Threads** → use case **Access the Threads API** → **Customize** →
   pastikan `threads_keyword_search` aktif (status "Ready for testing").
2. SinaraCast → Manajemen Akun → panel Threads → **Sambungkan ulang** akun @tetraphotobooth supaya token baru
   ikut membawa izin pencarian. Cek: `threads_cari` tidak lagi menjawab "izin belum diberikan" (masih ada
   peringatan "hanya postingan sendiri" sampai review lolos).
3. **App settings → Basic**: isi Privacy Policy URL, Terms URL, Data deletion URL (tabel di atas), kategori
   "Business and pages", ikon app. Simpan.
4. **Verifikasi bisnis** (kalau diminta): Business Settings → Security Center → Start verification (dokumen usaha
   Tetra Photobooth).
5. **App Review → Permissions and features** → `threads_keyword_search` → **Request advanced access**. Isi:
   - **Deskripsi penggunaan** (contoh, sesuaikan):
     > Tetra Photobooth is a photobooth rental business in Bogor, Indonesia. Our internal tool (SinaraCast) searches
     > public Threads posts for keywords such as "photobooth bogor" or "sewa photobooth" so our team can find people
     > who are planning weddings or events and reply publicly with helpful information. Replies are written for
     > each post, limited to 8 per day, and never sent to competitor accounts. Search results are not stored or
     > shared; only our own replies are logged for review.
   - **Screencast** (1–2 menit): login SinaraCast → Manajemen Akun → Sambungkan Threads (layar izin Meta terlihat)
     → tunjukkan hasil pencarian + satu balasan yang terbit di Threads.
   - **Langkah uji untuk reviewer**: beri akun uji (Threads Tester) dan tulis urutan klik yang sama.
6. Submit. Biasanya beberapa hari kerja. Setelah lolos, ubah app ke **Live** (toggle di atas dashboard). Tidak perlu
   deploy ulang SinaraCast.

## Catatan
- `threads_manage_mentions` belum dipakai tool mana pun, jadi tidak perlu diminta sekarang.
- Pengaman yang sudah jalan di server: balasan ke postingan orang lain maks 300 karakter, 8 per hari, sekali per
  postingan, akun di daftar kompetitor ditolak, dan semuanya tercatat di tabel `ig_comment_action`
  (jenis `threads_reply_luar`, berisi teks, username tujuan, dan link postingan).
