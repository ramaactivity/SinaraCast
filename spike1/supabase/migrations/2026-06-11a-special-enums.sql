-- Hari Spesial: enum additions. Kept in their own migration because Postgres
-- forbids USING a value added by ALTER TYPE ... ADD VALUE inside the same
-- transaction batch; the table/column migration (2026-06-11b) runs separately.
alter type pool_role add value if not exists 'special';
alter type notif_type add value if not exists 'info';
