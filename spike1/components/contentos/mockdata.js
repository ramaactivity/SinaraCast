/* ============================================================
   Content OS — mock data. Four independent brands, WIB times,
   believable rules + run history. Indonesian, warm/plain copy.

   NOTE: this is the mock data layer the prototype consumed via
   `window.MOCK`. Per tsd.md §10, the backend phase replaces these
   reads with Supabase queries (schema.md §9 mapping) — the shapes
   here are the contract the components expect.
   ============================================================ */

const CHANNELS = [
  { id: "mahakan", brand: "mahakan", handle: "@mahakan.coffee", status: "Connected", tokenExpires: "12 Agu 2026", lastRefresh: "2 hari lalu", paused: false, followers: "8.2rb" },
  { id: "tiska", brand: "tiska", handle: "@tiska.catering", status: "Expiring", tokenExpires: "9 Jun 2026", lastRefresh: "31 hari lalu", paused: false, followers: "3.1rb" },
  { id: "tetra", brand: "tetra", handle: "@tetra.photobooth", status: "Connected", tokenExpires: "20 Agu 2026", lastRefresh: "5 hari lalu", paused: true, resumeDate: "10 Jun 2026", followers: "1.9rb" },
  { id: "outentika", brand: "outentika", handle: "@outentika", status: "Needs reconnect", tokenExpires: "Kedaluwarsa", lastRefresh: "—", paused: false, followers: "5.6rb" },
];

// Rules per channel
const RULES = [
  // Mahakan Coffee
  { id: "r1", ch: "mahakan", name: "Jam buka", mode: "schedule", active: true, cadence: "Setiap hari", time: "08:00", grace: 30,
    pools: { weekday: 8, weekend: 6 }, weekdayTime: "14:00", weekendTime: "09:00", cycle: { used: 3, total: 8 }, nextRun: "Besok, 08:00 WIB", todayStatus: "Published", lastImg: 2,
    runs7: [1,1,1,1,1,1,1] },
  { id: "r2", ch: "mahakan", name: "Menu spesial", mode: "pool", active: true, cadence: "Setiap 2 hari", time: "16:30", grace: 20,
    pools: { pool: 5 }, cycle: { used: 1, total: 5 }, nextRun: "3 Jun, 16:30 WIB", todayStatus: "Scheduled", lastImg: 4, runs7: [1,0,1,0,1,0,1] },
  { id: "r3", ch: "mahakan", name: "Promo akhir pekan", mode: "schedule", active: false, cadence: "Sab, Min", time: "10:00", grace: 30,
    pools: { weekday: 0, weekend: 4 }, cycle: { used: 0, total: 4 }, nextRun: "Nonaktif", todayStatus: "Inactive", lastImg: 1, runs7: [0,0,0,0,0,1,1] },
  // Tiska Catering
  { id: "r4", ch: "tiska", name: "Konten harian", mode: "pool", active: true, cadence: "Setiap hari", time: "11:00", grace: 30,
    pools: { pool: 12 }, cycle: { used: 7, total: 12 }, nextRun: "Hari ini, 11:00 WIB", todayStatus: "Publishing", lastImg: 6, runs7: [1,1,1,1,1,1,1] },
  { id: "r5", ch: "tiska", name: "Paket katering", mode: "pool", active: true, cadence: "Sen, Rab, Jum", time: "19:00", grace: 25,
    pools: { pool: 6 }, cycle: { used: 2, total: 6 }, nextRun: "Besok, 19:00 WIB", todayStatus: "Failed", lastImg: 3, failReason: "Media gagal diunggah ke Meta (timeout). Coba lagi otomatis 2×.", runs7: [1,1,0,1,1,1,0] },
  // Tetra Photobooth (paused brand)
  { id: "r6", ch: "tetra", name: "Catalog", mode: "schedule", active: true, cadence: "Setiap hari", time: "12:00", grace: 30,
    pools: { weekday: 5, weekend: 5 }, cycle: { used: 2, total: 5 }, nextRun: "Dijeda", todayStatus: "Paused", lastImg: 2, runs7: [1,1,1,0,0,0,0] },
  { id: "r7", ch: "tetra", name: "Behind the scene", mode: "pool", active: true, cadence: "Setiap 3 hari", time: "17:00", grace: 30,
    pools: { pool: 4 }, cycle: { used: 0, total: 4 }, nextRun: "Dijeda", todayStatus: "Paused", lastImg: 0, runs7: [0,0,1,0,0,1,0] },
  // Outentika (needs reconnect)
  { id: "r8", ch: "outentika", name: "Konten harian", mode: "pool", active: true, cadence: "Setiap hari", time: "09:30", grace: 30,
    pools: { pool: 9 }, cycle: { used: 4, total: 9 }, nextRun: "Tertahan — koneksi", todayStatus: "Failed", lastImg: 5, failReason: "Channel perlu disambungkan ulang. Token Meta kedaluwarsa.", runs7: [1,1,1,1,0,0,0] },
];

// Activity log — reverse chronological post_runs
const RUNS = [
  { id: "p100", ch: "tiska", rule: "Konten harian", status: "Publishing", trigger: "scheduled", sched: "3 Jun 2025, 11:00", actual: "—", img: 6, pool: "Pool", attempts: [{ t: "11:00:02", o: "Mengunggah media…" }] },
  { id: "p99", ch: "mahakan", rule: "Jam buka", status: "Published", trigger: "scheduled", sched: "3 Jun 2025, 08:00", actual: "3 Jun 2025, 08:00", img: 2, pool: "Weekday", link: "instagram.com/stories/mahakan.coffee/331", attempts: [{ t: "08:00:01", o: "Media divalidasi (9:16)" }, { t: "08:00:03", o: "Dipublikasikan ✓" }] },
  { id: "p98", ch: "outentika", rule: "Konten harian", status: "Failed", trigger: "scheduled", sched: "3 Jun 2025, 09:30", actual: "—", img: 5, pool: "Pool", fail: "Channel perlu disambungkan ulang. Token Meta kedaluwarsa.", attempts: [{ t: "09:30:00", o: "Cek token gagal — kedaluwarsa", fail: true }, { t: "09:30:05", o: "Publikasi dibatalkan", fail: true }] },
  { id: "p97", ch: "tiska", rule: "Paket katering", status: "Failed", trigger: "scheduled", sched: "2 Jun 2025, 19:00", actual: "—", img: 3, pool: "Pool", fail: "Media gagal diunggah ke Meta (timeout).", attempts: [{ t: "19:00:01", o: "Percobaan 1 — timeout", fail: true }, { t: "19:01:30", o: "Percobaan 2 — timeout", fail: true }, { t: "19:04:10", o: "Melewati grace window — dilewati", fail: true }] },
  { id: "p96", ch: "mahakan", rule: "Menu spesial", status: "Published", trigger: "manual", sched: "2 Jun 2025, 16:30", actual: "2 Jun 2025, 16:31", img: 4, pool: "Pool", link: "instagram.com/stories/mahakan.coffee/330", attempts: [{ t: "16:30:44", o: "Dijalankan manual (post-now)" }, { t: "16:31:02", o: "Dipublikasikan ✓" }] },
  { id: "p95", ch: "mahakan", rule: "Jam buka", status: "Published", trigger: "swap", sched: "2 Jun 2025, 08:00", actual: "2 Jun 2025, 08:00", img: 5, pool: "Weekday", link: "instagram.com/stories/mahakan.coffee/329", attempts: [{ t: "08:00:00", o: "Gambar diganti manual untuk hari ini" }, { t: "08:00:02", o: "Dipublikasikan ✓" }] },
  { id: "p94", ch: "tiska", rule: "Konten harian", status: "Published", trigger: "scheduled", sched: "2 Jun 2025, 11:00", actual: "2 Jun 2025, 11:00", img: 5, pool: "Pool", link: "instagram.com/stories/tiska.catering/210", attempts: [{ t: "11:00:01", o: "Dipublikasikan ✓" }] },
  { id: "p93", ch: "tetra", rule: "Catalog", status: "Skipped", trigger: "scheduled", sched: "2 Jun 2025, 12:00", actual: "—", img: 2, pool: "Weekday", fail: "Channel dijeda (vacation mode).", attempts: [{ t: "12:00:00", o: "Channel dijeda — dilewati" }] },
  { id: "p92", ch: "mahakan", rule: "Jam buka", status: "Published", trigger: "scheduled", sched: "1 Jun 2025, 08:00", actual: "1 Jun 2025, 08:00", img: 1, pool: "Weekday", link: "instagram.com/stories/mahakan.coffee/328", attempts: [{ t: "08:00:02", o: "Dipublikasikan ✓" }] },
  { id: "p91", ch: "outentika", rule: "Konten harian", status: "Published", trigger: "scheduled", sched: "31 Mei 2025, 09:30", actual: "31 Mei 2025, 09:30", img: 3, pool: "Pool", link: "instagram.com/stories/outentika/188", attempts: [{ t: "09:30:01", o: "Dipublikasikan ✓" }] },
  { id: "p90", ch: "tiska", rule: "Konten harian", status: "Published", trigger: "scheduled", sched: "1 Jun 2025, 11:00", actual: "1 Jun 2025, 11:00", img: 4, pool: "Pool", link: "instagram.com/stories/tiska.catering/209", attempts: [{ t: "11:00:01", o: "Dipublikasikan ✓" }] },
  { id: "p89", ch: "tetra", rule: "Behind the scene", status: "Skipped", trigger: "scheduled", sched: "1 Jun 2025, 17:00", actual: "—", img: 0, pool: "Pool", fail: "Hari libur (holiday) yang dijadwalkan.", attempts: [{ t: "17:00:00", o: "Tanggal libur — dilewati" }] },
];

// Notifications (mirror of alerts)
const NOTIFS = [
  { id: "n1", type: "error", ch: "outentika", title: "Publikasi gagal — Outentika", body: "Konten harian tidak terbit. Token Meta kedaluwarsa, sambungkan ulang channel.", time: "Hari ini, 09:30", read: false, runId: "p98" },
  { id: "n2", type: "error", ch: "tiska", title: "Publikasi gagal — Tiska Catering", body: "Paket katering gagal terbit setelah 2 percobaan (timeout).", time: "Kemarin, 19:04", read: false, runId: "p97" },
  { id: "n3", type: "warn", ch: "tiska", title: "Token akan kedaluwarsa", body: "Tiska Catering kedaluwarsa dalam 5 hari. Refresh otomatis akan dicoba.", time: "Kemarin, 06:00", read: false, runId: null },
  { id: "n4", type: "success", ch: "mahakan", title: "Posting berhasil — Mahakan Coffee", body: "Menu spesial terbit (post-now manual).", time: "Kemarin, 16:31", read: true, runId: "p96" },
  { id: "n5", type: "warn", ch: "outentika", title: "Run terlewat (heartbeat)", body: "Konten harian Outentika tidak berjalan dalam grace window.", time: "2 hari lalu, 09:45", read: true, runId: null },
  { id: "n6", type: "success", ch: "mahakan", title: "Ringkasan harian", body: "3 dari 4 channel posting normal hari ini.", time: "2 hari lalu, 22:00", read: true, runId: null },
];

const SETTINGS = {
  pauseAll: false, resumeDate: "", timezone: "Asia/Jakarta (WIB, UTC+7)", defaultGrace: 30,
  telegram: { connected: true, handle: "@rama" }, failAlerts: true, dailyPing: true,
  storage: { used: 612, total: 1024 }, // MB
};

const PROFILE = { name: "Rama", email: "rama@contentos.id", method: "Magic link", joined: "Jan 2025" };

const ONBOARDING = [
  { id: "dev", title: "Akun developer Meta", body: "Buat akun developer & aplikasi dalam Development Mode.", done: true },
  { id: "biz", title: "Ubah IG ke Business + hubungkan Page", body: "Konversi akun Instagram ke Business dan sambungkan ke Facebook Page.", done: true },
  { id: "connect", title: "Sambungkan channel", body: "Otorisasi hingga 4 channel Instagram Business.", done: false, current: true },
  { id: "telegram", title: "Siapkan Telegram", body: "Hubungkan bot Telegram untuk menerima alert kegagalan.", done: false },
];

export const MOCK = { CHANNELS, RULES, RUNS, NOTIFS, SETTINGS, PROFILE, ONBOARDING };
