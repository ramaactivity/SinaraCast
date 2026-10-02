-- Threads sebagai akun di Manajemen Akun (untuk agent Hermes lewat /api/mcp).
-- Akun Threads tidak ikut mesin publikasi: tidak punya jadwal/postingan, dan UI
-- tidak menawarkannya di pembuat postingan. Yang dipakai hanya koneksi + token.
alter table channel add column if not exists threads_user_id text;
create index if not exists channel_threads_user_idx on channel (threads_user_id);

-- Log aksi tulis Hermes ikut dipakai untuk Threads (posting + balas komentar).
alter table ig_comment_action drop constraint if exists ig_comment_action_kind_check;
alter table ig_comment_action add constraint ig_comment_action_kind_check
  check (kind in ('reply', 'private_reply', 'threads_post', 'threads_reply'));

-- Token Threads (60 hari) diperpanjang oleh refreshTokensDue, jadi token_due
-- harus ikut menghitung akun Threads. Sisa fungsi identik dengan 2026-08-31.
create or replace function public.sinaracast_tick_plan(
  p_today   text,
  p_stale   timestamptz,
  p_minute  timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows int;
begin
  -- Klaim menit ini. Kalau baris untuk menit yang sama sudah ada, berarti eksekusi
  -- lain sudah memegangnya → pemanggil berhenti tanpa mengerjakan apa pun.
  insert into public.cron_tick (minute_bucket)
  values (date_trunc('minute', p_minute))
  on conflict (minute_bucket) do nothing;
  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    return jsonb_build_object('claimed', false);
  end if;

  delete from public.cron_tick where minute_bucket < now() - interval '1 day';

  -- Tiap angka di bawah menjawab satu pertanyaan yang dulu jadi query tersendiri
  -- di tiap detak. Nol berarti subsistemnya boleh dilewati menit ini.
  return jsonb_build_object(
    'claimed', true,

    'stuck_posts', (
      select count(*) from scheduled_post
      where status = 'publishing' and scheduled_at < p_stale),

    'stuck_runs', (
      select count(*) from post_run
      where status = 'publishing' and created_at < p_stale and scheduled_post_id is null),

    'resume_runs', (
      select count(*) from post_run
      where status = 'publishing' and ig_media_id is not null and created_at >= p_stale),

    'due_posts', (
      select count(*) from scheduled_post
      where status = 'scheduled' and scheduled_at <= now()),

    'token_due', (
      select count(*) from channel
      where platform in ('instagram', 'threads') and token_status = 'connected'
        and archived_at is null and access_token is not null
        and (token_expires_at is null or token_expires_at <= now() + interval '10 days')),

    'plan_metrics_due', (
      select count(*) from content_plan
      where auto_managed
        and status::text = 'posted'
        and platform::text = 'instagram'
        and format::text = any (array['feed','reels','carousel','video','single_image'])
        and metrics_source::text <> 'manual'   -- NULL ikut tersaring, sama seperti .neq() di PostgREST
        and post_run_id is not null
        and posted_at >= now() - interval '30 days'
        and (metrics_updated_at is null or metrics_updated_at <= now() - interval '24 hours')),

    -- Cerminan aturan di refreshRunMetricsDue: Story punya jendela 20 jam, feed/reels
    -- disegarkan sehari sekali, dan baris non-Instagram perlu dibekukan.
    'run_metrics_due', (
      select count(*)
      from post_run r
      left join scheduled_post sp on sp.id = r.scheduled_post_id
      left join channel c on c.id = r.channel_id
      where r.status = 'published' and r.metrics_final = false and r.ig_media_id is not null
        and (
          c.platform is distinct from 'instagram'
          or coalesce(sp.post_type::text, 'story') = 'tiktok_video'
          or case
               when r.rule_id is not null or coalesce(sp.post_type::text, 'story') = 'story'
                 then r.published_at <= now() - interval '20 hours'
               else (r.metrics_pulled_at is null
                     or r.metrics_pulled_at <= now() - interval '24 hours')
             end
        )),

    'followers_due', (
      select count(*) from channel c
      where c.token_status = 'connected' and c.archived_at is null
        and not exists (
          select 1 from follower_snapshot f
          where f.channel_id = c.id and f.snap_date = p_today::date)),

    'special_sync_due', (
      select count(*) from app_user u
      where not exists (
        select 1 from app_settings s
        where s.owner_id = u.id and s.special_sync_on = p_today::date)),

    'special_reminder_due', (
      select count(*) from app_user u
      where not exists (
        select 1 from app_settings s
        where s.owner_id = u.id and s.special_reminder_on = p_today::date))
  );
end;
$$;

revoke all on function public.sinaracast_tick_plan(text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.sinaracast_tick_plan(text, timestamptz, timestamptz)
  to service_role;
