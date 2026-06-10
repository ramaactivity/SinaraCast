-- Multi-Story per run: a schedule's pool can post N Stories in one fire.
-- IG Stories have no carousel, so N images publish as N separate Story frames,
-- back-to-back. story_count is per pool role (single / weekday / weekend), so the
-- "Beda akhir pekan" mode can use a different count for weekdays vs weekends.
-- Default 1 keeps every existing rule posting exactly one Story (backward-compatible).
alter table pool add column if not exists story_count int not null default 1;
do $$ begin
  alter table pool add constraint pool_story_count_chk check (story_count between 1 and 5);
exception when duplicate_object then null; end $$;
