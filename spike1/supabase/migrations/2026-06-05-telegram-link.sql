-- Spike 3 Part B: Telegram chat linking.
-- A one-time random code is written to app_settings when the user starts the
-- connect flow; the Telegram webhook looks the owner up by this code, then
-- stores telegram_chat_id and flips telegram_connected. Cleared after linking.
alter table app_settings add column if not exists telegram_link_code text;
create index if not exists app_settings_tg_link_idx on app_settings (telegram_link_code);
