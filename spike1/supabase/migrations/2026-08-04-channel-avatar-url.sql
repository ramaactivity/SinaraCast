-- channel.avatar_url: the account's profile picture URL, resolved at connect time
-- (Instagram profile_picture_url / TikTok avatar_url). It's written by both OAuth
-- callbacks and read by the app's channel list. The column existed on the original
-- production DB but was only ever added ad-hoc — it was never captured as a migration,
-- so provisioning a fresh project from files (the R2/Supabase move) dropped it, which
-- made the whole channel query 400 and blanked every account ("0 akun"). Capture it here.
alter table channel add column if not exists avatar_url text;
