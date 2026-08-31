-- Mesin publikasi berdetak tiap menit. Sebelum ini, tiap detak menembak ~26 query
-- hanya untuk menemukan bahwa tidak ada yang perlu dikerjakan, dan karena pg_net
-- selalu timeout di 5 detik, tiap detak dieksekusi dua kali. Hasilnya ~52 query per
-- menit sepanjang hari, yang menghabiskan jatah egress bulanan sendirian.
--
-- Satu fungsi di bawah menggantikan seluruh tahap "cari kerjaan" itu dengan satu
-- panggilan, sekaligus mengunci menitnya supaya eksekusi kembar tidak mengerjakan
-- hal yang sama dua kali.

create table if not exists public.cron_tick (
  minute_bucket timestamptz primary key,
  started_at    timestamptz not null default now()
);

alter table public.cron_tick enable row level security;
-- Tabel milik mesin saja. service_role melewati RLS, jadi sengaja tanpa policy:
-- anon/authenticated tidak boleh menyentuhnya sama sekali.

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
      where platform = 'instagram' and token_status = 'connected'
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
