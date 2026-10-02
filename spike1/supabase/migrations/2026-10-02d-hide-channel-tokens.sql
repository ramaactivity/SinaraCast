-- Token akun sosial (Instagram/Threads/TikTok) hanya dipakai server (service_role).
-- Sebelumnya RLS mengizinkan pemilik membaca SEMUA kolom channel dari browser, jadi
-- sesi yang dicuri atau XSS bisa mengambil token dan memposting atas nama akun.
-- Sekarang browser hanya boleh membaca kolom non-rahasia.
--
-- PENTING: kolom BARU di channel tidak otomatis terbaca dari browser. Kalau UI
-- butuh kolom baru, tambahkan di grant di bawah lewat migrasi baru
-- (service_role tidak terpengaruh).
revoke select on channel from anon, authenticated;

do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'channel'
    and column_name not in ('access_token', 'refresh_token');
  execute format('grant select (%s) on channel to authenticated', cols);
end $$;
