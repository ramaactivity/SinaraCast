import { notify } from "./publishCore";

// Hari Spesial engine: keeps each owner's special_day calendar filled from a
// public Indonesian holiday API (with a baked-in seed as offline fallback) and
// sends H-7 / H-1 reminders. Sync NEVER updates existing rows (insert-only), so
// anything the user edited or deactivated stays exactly as they left it.
// API/seed rows are deactivated in the UI rather than deleted, so a later sync
// can't resurrect them.

const API = "https://libur.deno.dev/api";

// Snapshot of the official 2026–2027 calendar (SKB; via libur.deno.dev,
// 2026-06-11). Used only when the API is unreachable and the owner has no
// api/seed rows yet.
const SEED = [
  { date: "2026-01-01", name: "Tahun Baru 2026 Masehi" },
  { date: "2026-01-16", name: "Isra Mi'raj Nabi Muhammad SAW" },
  { date: "2026-02-16", name: "Cuti Bersama Tahun Baru Imlek 2577 Kongzili" },
  { date: "2026-02-17", name: "Tahun Baru Imlek 2577 Kongzili" },
  { date: "2026-03-18", name: "Cuti Bersama Hari Suci Nyepi Tahun Baru Saka 1948" },
  { date: "2026-03-19", name: "Hari Suci Nyepi Tahun Baru Saka 1948" },
  { date: "2026-03-20", name: "Cuti Bersama Hari Raya Idul Fitri 1447 Hijriyah" },
  { date: "2026-03-21", name: "Hari Raya Idul Fitri 1447 Hijriyah" },
  { date: "2026-03-22", name: "Hari Raya Idul Fitri 1447 Hijriyah" },
  { date: "2026-03-23", name: "Cuti Bersama Hari Raya Idul Fitri 1447 Hijriyah" },
  { date: "2026-03-24", name: "Cuti Bersama Hari Raya Idul Fitri 1447 Hijriyah" },
  { date: "2026-04-03", name: "Wafat Yesus Kristus / Jumat Agung" },
  { date: "2026-04-05", name: "Kebangkitan Yesus Kristus (Paskah)" },
  { date: "2026-05-01", name: "Hari Buruh Internasional" },
  { date: "2026-05-14", name: "Kenaikan Yesus Kristus" },
  { date: "2026-05-15", name: "Cuti Bersama Kenaikan Yesus Kristus" },
  { date: "2026-05-27", name: "Hari Raya Idul Adha 1447 Hijriyah" },
  { date: "2026-05-28", name: "Cuti Bersama Hari Raya Idul Adha 1447 Hijriyah" },
  { date: "2026-05-31", name: "Hari Raya Waisak 2570 BE" },
  { date: "2026-06-01", name: "Hari Lahir Pancasila" },
  { date: "2026-06-16", name: "Tahun Baru Islam 1448 Hijriyah" },
  { date: "2026-08-17", name: "Hari Kemerdekaan Republik Indonesia" },
  { date: "2026-08-25", name: "Maulid Nabi Muhammad SAW" },
  { date: "2026-12-24", name: "Cuti Bersama Hari Raya Natal" },
  { date: "2026-12-25", name: "Hari Raya Natal" },
  { date: "2027-01-01", name: "Tahun Baru 2027 Masehi" },
  { date: "2027-01-05", name: "Isra Mi'raj Nabi Muhammad SAW" },
  { date: "2027-02-06", name: "Tahun Baru Imlek 2578 Kongzili" },
  { date: "2027-03-09", name: "Hari Suci Nyepi Tahun Baru Saka 1947" },
  { date: "2027-03-10", name: "Hari Raya Idul Fitri 1448 Hijriyah" },
  { date: "2027-03-11", name: "Hari Raya Idul Fitri 1448 Hijriyah" },
  { date: "2027-03-26", name: "Wafat Yesus Kristus / Jumat Agung" },
  { date: "2027-05-01", name: "Hari Buruh Internasional" },
  { date: "2027-05-06", name: "Kenaikan Yesus Kristus" },
  { date: "2027-05-17", name: "Hari Raya Idul Adha 1448 Hijriyah" },
  { date: "2027-05-20", name: "Hari Raya Waisak 2569 BE" },
  { date: "2027-06-01", name: "Hari Lahir Pancasila" },
  { date: "2027-06-06", name: "Tahun Baru Islam 1449 Hijriyah" },
  { date: "2027-08-15", name: "Maulid Nabi Muhammad SAW" },
  { date: "2027-08-17", name: "Hari Kemerdekaan Republik Indonesia" },
  { date: "2027-12-25", name: "Hari Raya Natal" },
];

const RELIGIOUS = /idul|natal|nyepi|waisak|isra|maulid|imlek|paskah|yesus|hijriyah|islam|galungan|kuningan/i;
export const categorize = (name) => (RELIGIOUS.test(name) ? "religious" : "national");

const wibDate = (offsetDays = 0) =>
  new Date(Date.now() + 7 * 3600 * 1000 + offsetDays * 86400 * 1000).toISOString().slice(0, 10);

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export function formatTanggalID(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${HARI[d.getUTCDay()]}, ${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

async function fetchYear(year) {
  try {
    const res = await fetch(`${API}?year=${year}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = await res.json();
    if (!Array.isArray(json)) return null;
    return json.filter((r) => r?.date && r?.name).map((r) => ({ date: r.date, name: r.name }));
  } catch (_) { return null; }
}

// Fill every owner's calendar from the API (insert-only; existing rows are never
// touched). Self-guarded to once per WIB day via app_settings.special_sync_on;
// pass force=true (the manual "Refresh sekarang" button) to bypass the guard.
export async function syncSpecialDaysDue(svc, { force = false } = {}) {
  const today = wibDate();
  const { data: owners = [] } = await svc.from("app_user").select("id");
  if (!owners?.length) return { synced: 0 };

  let dueOwners = owners;
  if (!force) {
    const { data: settings = [] } = await svc.from("app_settings")
      .select("owner_id, special_sync_on").in("owner_id", owners.map((o) => o.id));
    const done = new Set((settings || []).filter((s) => s.special_sync_on === today).map((s) => s.owner_id));
    dueOwners = owners.filter((o) => !done.has(o.id));
  }
  if (!dueOwners.length) return { synced: 0, note: "already synced today" };

  const year = Number(today.slice(0, 4));
  let rows = [];
  for (const y of [year, year + 1]) {
    const r = await fetchYear(y);
    if (r) rows.push(...r);
  }
  let source = "api";
  if (!rows.length) { rows = SEED; source = "seed"; }

  let synced = 0;
  for (const o of dueOwners) {
    const inserts = rows.map((r) => ({
      owner_id: o.id, on_date: r.date, name: r.name, category: categorize(r.name), source,
    }));
    // insert-only: rows already present (any source, touched or not) are skipped
    const { error } = await svc.from("special_day")
      .upsert(inserts, { onConflict: "owner_id,on_date,name", ignoreDuplicates: true });
    if (error) continue;
    await svc.from("app_settings").upsert({ owner_id: o.id, special_sync_on: today }, { onConflict: "owner_id" });
    synced++;
  }
  return { synced, source, days: rows.length };
}

// H-7 and H-1 reminders for upcoming special days, in-app + Telegram (notify()
// fans out). Once per WIB day per owner via app_settings.special_reminder_on.
export async function specialDayRemindersDue(svc) {
  const today = wibDate();
  const targets = [{ days: 7, date: wibDate(7) }, { days: 1, date: wibDate(1) }];
  const { data: owners = [] } = await svc.from("app_user").select("id");
  if (!owners?.length) return { reminded: 0 };

  const { data: settings = [] } = await svc.from("app_settings")
    .select("owner_id, special_reminder_on, special_reminders").in("owner_id", owners.map((o) => o.id));
  const done = new Set((settings || []).filter((s) => s.special_reminder_on === today).map((s) => s.owner_id));
  const off = new Set((settings || []).filter((s) => s.special_reminders === false).map((s) => s.owner_id));

  let reminded = 0;
  for (const o of owners) {
    if (done.has(o.id)) continue;
    if (off.has(o.id)) { // reminders disabled in Pengaturan — mark today done, send nothing
      await svc.from("app_settings").upsert({ owner_id: o.id, special_reminder_on: today }, { onConflict: "owner_id" });
      continue;
    }
    const { data: days = [] } = await svc.from("special_day")
      .select("on_date, name").eq("owner_id", o.id).eq("is_active", true)
      .in("on_date", targets.map((t) => t.date));
    for (const d of days || []) {
      const t = targets.find((x) => x.date === d.on_date);
      await notify(svc, {
        ownerId: o.id, channelId: null, type: "info",
        title: `${t.days} hari lagi: ${d.name}`,
        body: `${formatTanggalID(d.on_date)}. Cek jadwal otomatismu: mau posting biasa, libur, atau pakai konten khusus? Atur dari halaman Hari Spesial.`,
      });
      reminded++;
    }
    await svc.from("app_settings").upsert({ owner_id: o.id, special_reminder_on: today }, { onConflict: "owner_id" });
  }
  return { reminded };
}

// Today's active special day per owner (Map ownerId → name). Used by the publish
// engine to decide each rule's behavior.
export async function specialTodayByOwner(svc, todayWibDate) {
  const { data = [] } = await svc.from("special_day")
    .select("owner_id, name").eq("is_active", true).eq("on_date", todayWibDate);
  const m = new Map();
  for (const d of data || []) if (!m.has(d.owner_id)) m.set(d.owner_id, d.name);
  return m;
}
