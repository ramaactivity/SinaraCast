-- Masa berlaku jadwal otomatis: rentang tanggal mulai/berhenti.
--
-- `end_date` sudah ada di schema.sql sejak awal tapi tidak pernah dipakai; kolomnya
-- bisa juga hilang di project hasil migrasi, jadi keduanya dibuat idempoten di sini.
-- Keduanya NULL = jadwal jalan selamanya (perilaku lama, tidak berubah).
alter table recurring_rule add column if not exists start_date date;
alter table recurring_rule add column if not exists end_date   date;
