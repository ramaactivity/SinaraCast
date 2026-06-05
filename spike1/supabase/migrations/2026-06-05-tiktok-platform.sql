-- TikTok spike — make `channel` multi-platform without disturbing the live
-- Instagram path. All additive: existing IG rows keep working untouched.
--
--   platform        which provider this channel posts to ('instagram' | 'tiktok')
--   tiktok_open_id  TikTok user id (the IG analogue is ig_user_id, left null for TikTok)
--   refresh_token   TikTok refresh token (~365d). Instagram doesn't use this column.
--
-- ig_user_id is already nullable, so TikTok rows just leave it null.

alter table channel add column if not exists platform text not null default 'instagram';
alter table channel add column if not exists tiktok_open_id text;
alter table channel add column if not exists refresh_token text;

-- Help the cron/refresh paths filter by provider cheaply.
create index if not exists channel_platform_idx on channel (platform);
