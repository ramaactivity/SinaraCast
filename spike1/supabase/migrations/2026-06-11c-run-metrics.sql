-- Per-post performance metrics, stored on post_run (the ground truth of what
-- actually published). Pulled automatically from IG insights by the cron:
-- Stories once near the end of their 24h life (then frozen — IG deletes story
-- insights after expiry), Feed/Reels refreshed daily until ~30 days old.
alter table post_run add column if not exists m_views    int;
alter table post_run add column if not exists m_reach    int;
alter table post_run add column if not exists m_likes    int;
alter table post_run add column if not exists m_comments int;
alter table post_run add column if not exists m_shares   int;
alter table post_run add column if not exists m_saves    int;
alter table post_run add column if not exists m_replies  int; -- story-only (DM replies)
alter table post_run add column if not exists metrics_pulled_at timestamptz;
alter table post_run add column if not exists metrics_final boolean not null default false;
create index if not exists post_run_metrics_due_idx on post_run (published_at desc)
  where status = 'published' and metrics_final = false;
