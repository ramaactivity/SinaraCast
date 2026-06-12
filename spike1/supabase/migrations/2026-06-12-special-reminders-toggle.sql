-- Settings toggle for the H-7/H-1 special-day reminders (on by default).
alter table app_settings add column if not exists special_reminders boolean not null default true;
