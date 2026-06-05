-- TikTok one-off VIDEO support in the real composer/engine. Additive; the live
-- Instagram path is untouched.
--
--   post_type 'tiktok_video'   one-off TikTok feed video (distinct from IG reels)
--   scheduled_post.tiktok_options  jsonb of the TikTok-compliant posting choices:
--     { privacy_level, allow_comment, allow_duet, allow_stitch,
--       commercial_content, your_brand, branded_content }
--
-- post_run reuses its existing ig_media_id column to stash the TikTok publish_id
-- when a video is still transcoding at the end of a cron tick (resume next tick).

alter type post_type add value if not exists 'tiktok_video';

alter table scheduled_post
  add column if not exists tiktok_options jsonb not null default '{}'::jsonb;
