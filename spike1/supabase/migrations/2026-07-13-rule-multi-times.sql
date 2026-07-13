-- Beberapa jam posting per hari: satu jadwal bisa terbit di banyak jam berbeda
-- dalam sehari (mis. pagi, sore, malam), tiap jam menarik 1 gambar dari kumpulan
-- lewat siklus "acak tanpa ulang" yang sudah ada. Menggantikan makna lama "N Story
-- beruntun di 1 jam" dengan "N jam terpisah dalam sehari".
--
-- Menyimpan daftar jam sebagai time[]. Kolom tunggal lama (post_time/weekday_time/
-- weekend_time) tetap ada untuk kompatibilitas & sebagai fallback; mesin membaca
-- array kalau ada, kalau tidak jatuh ke kolom tunggal. Backfill mengisi array dengan
-- 1 elemen dari kolom tunggal sehingga semua jadwal lama jalan tanpa perubahan.
alter table recurring_rule add column if not exists post_times    time[];
alter table recurring_rule add column if not exists weekday_times time[];
alter table recurring_rule add column if not exists weekend_times time[];

update recurring_rule set post_times    = array[post_time]    where post_time    is not null and post_times    is null;
update recurring_rule set weekday_times = array[weekday_time] where weekday_time is not null and weekday_times is null;
update recurring_rule set weekend_times = array[weekend_time] where weekend_time is not null and weekend_times is null;
