-- Satu postingan sekali yang terbit di BEBERAPA tanggal (Story).
--
-- Modelnya sengaja "satu baris scheduled_post per tanggal", bukan satu baris
-- dengan daftar tanggal: mesin publikasi (app/api/cron) sudah mengambil baris
-- yang status='scheduled' dan scheduled_at <= sekarang, lalu meng-claim-nya
-- secara atomik. Dengan satu baris per tanggal, jaminan "tidak terbit dua kali",
-- retry, post_run, metrik, dan tampilan kalender ikut apa adanya — nol
-- perubahan pada jalur terbit.
--
-- series_id mengikat baris-baris itu supaya UI bisa memperlakukannya sebagai
-- satu rangkaian (ubah semua tanggal sekaligus, hapus sisa yang belum terbit).
-- NULL = postingan sekali biasa, persis perilaku lama.
alter table scheduled_post add column if not exists series_id uuid;
create index if not exists scheduled_post_series_idx on scheduled_post (series_id);
