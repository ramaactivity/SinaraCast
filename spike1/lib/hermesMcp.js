// MCP server minimal untuk agent Hermes (Bruno): komentar Instagram + Threads Tetra.
// JSON-RPC polos, stateless, satu POST = satu jawaban (pola Tetra Ops
// src/lib/ai/mcp.ts). Modul ini tanpa import Next/Supabase supaya bisa diuji
// dengan `node --test`; route /api/mcp menyuntikkan `deps`:
//   deps.channel                 baris channel Tetra untuk tool ini (IG atau Threads, dipilih route) atau null
//   deps.ig(method, path, {query, body})  -> { status, json }   (graph.instagram.com, token sudah terpasang)
//   deps.th(method, path, {query})        -> { status, json }   (graph.threads.net/v1.0, token sudah terpasang)
//   deps.kompetitor()            -> Set username Threads kompetitor (huruf kecil, tanpa @)
//   deps.log.done(channelId, kind)        -> Set comment_id yang sudah pernah ditindak
//   deps.log.countSince(channelId, kind, iso) -> jumlah aksi sejak iso
//   deps.log.claim(row)          -> true kalau berhasil klaim, false kalau sudah ada (unik per komentar+jenis)
//   deps.log.release(channelId, commentId, kind)   batalkan klaim kalau Instagram menolak
//   deps.log.finish(channelId, commentId, kind, resultId)
//   deps.now()                   -> Date
//
// ponytail: polling saat ig_komentar dipanggil (25 postingan terbaru), tanpa
// webhook. Tambah webhook comments kalau Bruno butuh lebih cepat dari polling.

import crypto from "node:crypto";

const PROTOCOL_VERSION = "2025-06-18";
const DAY = 86400 * 1000;
export const LIMITS = { reply: 60, private_reply: 30, threads_post: 10, threads_reply: 60, threads_reply_luar: 8 };
const SCOPE_COMMENTS = "instagram_business_manage_comments";
const SCOPE_MESSAGES = "instagram_business_manage_messages";
const IZIN_TH = "Izin Threads belum lengkap — sambung ulang akun Threads Tetra di SinaraCast (Manajemen Akun).";
const IZIN = "Izin komentar belum diberikan — sambung ulang channel Tetra di SinaraCast (Manajemen Akun → Sambungkan ulang).";
const SHORTLINK = /\b(bit\.ly|tinyurl\.com|s\.id|t\.co|goo\.gl|cutt\.ly|rb\.gy|shorturl\.at|ow\.ly|is\.gd|lnk\.bio|linktr\.ee)\b/i;

export const TOOLS = [
  {
    name: "ig_komentar",
    description: "Daftar komentar orang lain di postingan/reels Instagram Tetra Photobooth dalam N hari terakhir (komentar milik akun Tetra sendiri dibuang). Pakai bisa_private_reply untuk tahu apakah DM resmi masih boleh dikirim.",
    inputSchema: { type: "object", properties: { hari: { type: "integer", minimum: 1, maximum: 7, description: "Rentang hari ke belakang, 1-7. Default 3." } } },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ig_balas_komentar",
    description: "Balas komentar secara PUBLIK (muncul di bawah komentar). Satu balasan per komentar. Maks 300 karakter.",
    inputSchema: { type: "object", properties: { comment_id: { type: "string" }, teks: { type: "string", maxLength: 300 } }, required: ["comment_id", "teks"] },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "ig_private_reply",
    description: "Kirim SATU DM resmi (Private Reply) ke orang yang berkomentar. Hanya untuk komentar ≤7 hari dan belum pernah dikirimi. Maks 500 karakter, tanpa link pendek.",
    inputSchema: { type: "object", properties: { comment_id: { type: "string" }, teks: { type: "string", maxLength: 500 } }, required: ["comment_id", "teks"] },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "threads_postingan_saya",
    description: "Daftar postingan Threads terbaru milik Tetra Photobooth (id, teks, waktu, link).",
    inputSchema: { type: "object", properties: { jumlah: { type: "integer", minimum: 1, maximum: 25, description: "1-25, default 10. (Alias: maks.)" } } },
    annotations: { readOnlyHint: true },
  },
  {
    name: "threads_komentar",
    description: "Komentar orang lain di postingan Threads terbaru Tetra (reply_id, username, teks, waktu, sudah_dibalas).",
    inputSchema: { type: "object", properties: {
      postingan: { type: "integer", minimum: 1, maximum: 10, description: "Berapa postingan terbaru yang dicek, 1-10, default 5." },
      hari: { type: "integer", minimum: 1, maximum: 7, description: "Opsional: hanya komentar N hari terakhir." },
    } },
    annotations: { readOnlyHint: true },
  },
  {
    name: "threads_posting",
    description: "Terbitkan satu postingan teks di Threads Tetra (publik). Maks 500 karakter. Teks yang persis sama tidak bisa diposting dua kali.",
    inputSchema: { type: "object", properties: { teks: { type: "string", maxLength: 500 } }, required: ["teks"] },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "threads_balas",
    description: "Balas secara publik di Threads: komentar di postingan Tetra (maks 500 karakter, 60/hari) ATAU postingan orang lain dari threads_cari (maks 300 karakter, 8/hari, akun kompetitor ditolak). Sekali per reply_id.",
    inputSchema: { type: "object", properties: { reply_id: { type: "string", description: "reply_id dari threads_komentar atau id dari threads_cari. (Alias: reply_to_id.)" }, teks: { type: "string", maxLength: 500 } }, required: ["reply_id", "teks"] },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "threads_cari",
    description: "Cari postingan Threads publik berdasarkan kata kunci atau topik (tag). Hasil menandai is_kompetitor dan sudah_dibalas. Sebelum App Review Meta disetujui, hasil hanya berisi postingan Tetra sendiri.",
    inputSchema: { type: "object", properties: {
      q: { type: "string", description: "Kata kunci, mis. \"photobooth bogor\"." },
      mode: { type: "string", enum: ["KEYWORD", "TAG"], description: "Default KEYWORD." },
      urutan: { type: "string", enum: ["TOP", "RECENT"], description: "Default TOP." },
      maks: { type: "integer", minimum: 1, maximum: 25, description: "Default 10." },
    }, required: ["q"] },
    annotations: { readOnlyHint: true },
  },
  {
    name: "threads_daftar_kompetitor",
    description: "Username Threads kompetitor yang tidak boleh dibalas (diatur Rama di SinaraCast).",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
  },
];

const ok = (id, result) => ({ status: 200, body: { jsonrpc: "2.0", id, result } });
const fail = (id, code, message) => ({ status: 200, body: { jsonrpc: "2.0", id, error: { code, message } } });
const toolResult = (id, r) => ok(id, { content: [{ type: "text", text: JSON.stringify(r) }], isError: !!r?.error });
const err = (error) => ({ error });

// Awal hari ini dalam WIB (UTC+7, tanpa DST), sebagai ISO UTC.
export function startOfDayWib(now) {
  const off = 7 * 3600 * 1000;
  return new Date(Math.floor((now.getTime() + off) / DAY) * DAY - off).toISOString();
}

const ownName = (ch) => String(ch.handle || "").replace(/^@/, "").toLowerCase();
const isOwn = (ch, c) => (c.from?.id && String(c.from.id) === String(ch.ig_user_id)) || String(c.username || c.from?.username || "").toLowerCase() === ownName(ch);
const hasScope = (ch, s) => Array.isArray(ch.ig_scopes) && ch.ig_scopes.includes(s);

// Error Graph API → pesan Indonesia. Error izin dipetakan ke instruksi sambung ulang.
function igError(json, fallback, izin = IZIN) {
  const e = json?.error || {};
  if ([10, 200, 190].includes(e.code) || /permission/i.test(e.message || "")) return izin;
  return `${fallback}: ${e.message || "Instagram tidak menjawab"}`;
}

function cekTeks(teks, max) {
  const s = typeof teks === "string" ? teks.trim() : "";
  if (!s) return "teks wajib diisi.";
  if (s.length > max) return `teks maksimal ${max} karakter (sekarang ${s.length}).`;
  return null;
}

async function igKomentar(args, deps) {
  const ch = deps.channel;
  if (!hasScope(ch, SCOPE_COMMENTS)) return err(IZIN);
  const hari = Math.min(7, Math.max(1, Number.isFinite(+args.hari) && +args.hari ? Math.floor(+args.hari) : 3));
  const now = deps.now();
  const cutoff = now.getTime() - hari * DAY;

  const media = await deps.ig("GET", `/${ch.ig_user_id}/media`, { query: { fields: "id,caption,timestamp,comments_count", limit: "25" } });
  if (media.status !== 200) return err(igError(media.json, "Gagal membaca postingan"));

  const [replied, dmed] = await Promise.all([deps.log.done(ch.id, "reply"), deps.log.done(ch.id, "private_reply")]);
  const out = [];
  for (const m of media.json.data || []) {
    if (!m.comments_count) continue;
    const r = await deps.ig("GET", `/${m.id}/comments`, { query: { fields: "id,text,timestamp,username,from,replies{id,username,from}", limit: "50" } });
    if (r.status !== 200) return err(igError(r.json, "Gagal membaca komentar"));
    for (const c of r.json.data || []) {
      const t = Date.parse(c.timestamp);
      if (!(t >= cutoff) || isOwn(ch, c)) continue;
      const terkirim = dmed.has(c.id);
      out.push({
        comment_id: c.id,
        username: c.username || c.from?.username || null,
        teks: c.text || "",
        waktu: c.timestamp,
        media_id: m.id,
        cuplikan_postingan: (m.caption || "").slice(0, 80),
        sudah_dibalas: replied.has(c.id) || (c.replies?.data || []).some((x) => isOwn(ch, x)),
        private_reply_terkirim: terkirim,
        bisa_private_reply: !terkirim && now.getTime() - t <= 7 * DAY,
      });
    }
  }
  out.sort((a, b) => Date.parse(b.waktu) - Date.parse(a.waktu));
  return { akun: ch.handle, hari, jumlah: out.length, komentar: out };
}

// Klaim → panggil API → selesai/batal. Klaim unik (channel, key, kind) = idempoten.
async function aksiTulis({ kind, key, teks, deps, kirim, dobel, gagal, izin = IZIN, extra = {} }) {
  const ch = deps.channel;
  const since = startOfDayWib(deps.now());
  if ((await deps.log.countSince(ch.id, kind, since)) >= LIMITS[kind]) {
    return err(`Batas harian tercapai (${LIMITS[kind]}/hari untuk ${kind}). Coba lagi besok.`);
  }
  const claimed = await deps.log.claim({ owner_id: ch.owner_id, channel_id: ch.id, comment_id: key, kind, text: teks, actor: "hermes", ...extra });
  if (!claimed) return err(dobel);
  const r = await kirim();
  const resultId = r.json?.id || r.json?.message_id || null;
  if (r.status !== 200 || !resultId) {
    await deps.log.release(ch.id, key, kind);
    return err(igError(r.json, gagal, izin));
  }
  await deps.log.finish(ch.id, key, kind, String(resultId));
  return { ok: true, id: String(resultId), ...(/^\d+$/.test(key) ? { comment_id: key } : {}) };
}

const cekId = (v) => (/^\d+$/.test(String(v || "")) ? String(v) : null);

async function igBalas(args, deps) {
  if (!hasScope(deps.channel, SCOPE_COMMENTS)) return err(IZIN);
  const bad = cekTeks(args.teks, 300);
  if (bad) return err(bad);
  const cid = cekId(args.comment_id);
  if (!cid) return err("comment_id tidak valid.");
  const teks = args.teks.trim();
  return aksiTulis({ kind: "reply", key: cid, teks, deps,
    kirim: () => deps.ig("POST", `/${cid}/replies`, { query: { message: teks } }),
    dobel: "Komentar ini sudah pernah dibalas lewat Hermes.", gagal: "Gagal membalas komentar" });
}

async function igPrivateReply(args, deps) {
  const ch = deps.channel;
  if (!hasScope(ch, SCOPE_COMMENTS) || !hasScope(ch, SCOPE_MESSAGES)) return err(IZIN);
  const bad = cekTeks(args.teks, 500) || (SHORTLINK.test(args.teks) ? "Jangan pakai link pendek (bit.ly, s.id, dll) di private reply." : null);
  if (bad) return err(bad);
  const cid = cekId(args.comment_id);
  if (!cid) return err("comment_id tidak valid.");
  const c = await deps.ig("GET", `/${cid}`, { query: { fields: "id,timestamp,username,from" } });
  if (c.status !== 200) return err(igError(c.json, "Komentar tidak ditemukan"));
  if (isOwn(ch, c.json)) return err("Itu komentar akun Tetra sendiri.");
  if (!(deps.now().getTime() - Date.parse(c.json.timestamp) <= 7 * DAY)) {
    return err("Komentar sudah lebih dari 7 hari; Instagram tidak mengizinkan private reply lagi. Balas publik saja.");
  }
  const teks = args.teks.trim();
  return aksiTulis({ kind: "private_reply", key: cid, teks, deps,
    kirim: () => deps.ig("POST", `/${ch.ig_user_id}/messages`, { body: { recipient: { comment_id: cid }, message: { text: teks } } }),
    dobel: "Private reply untuk komentar ini sudah pernah dikirim (Instagram hanya mengizinkan satu).", gagal: "Gagal mengirim private reply" });
}

// ---- Threads ----
const thOk = (ch) => ch?.platform === "threads";
const uname = (u) => String(u || "").replace(/^@/, "").toLowerCase();

// Threads menerbitkan dua langkah: buat container, lalu publish.
async function thTerbit(deps, query) {
  const uid = deps.channel.threads_user_id;
  const c = await deps.th("POST", `/${uid}/threads`, { query: { media_type: "TEXT", ...query } });
  if (c.status !== 200 || !c.json?.id) return c;
  return deps.th("POST", `/${uid}/threads_publish`, { query: { creation_id: c.json.id } });
}

async function thPostingan(args, deps) {
  const ch = deps.channel;
  const n = Math.min(25, Math.max(1, Math.floor(+(args.jumlah ?? args.maks)) || 10));
  const r = await deps.th("GET", `/${ch.threads_user_id}/threads`, { query: { fields: "id,text,timestamp,permalink", limit: String(n) } });
  if (r.status !== 200) return err(igError(r.json, "Gagal membaca postingan Threads", IZIN_TH));
  return { akun: ch.handle, postingan: (r.json.data || []).map((p) => ({ id: p.id, teks: p.text || "", waktu: p.timestamp, link: p.permalink || null })) };
}

// ponytail: hanya komentar tingkat pertama; sudah_dibalas dari log Hermes saja.
async function thKomentar(args, deps) {
  const ch = deps.channel;
  const n = Math.min(10, Math.max(1, Math.floor(+args.postingan) || 5));
  const hari = Math.floor(+args.hari) || 0;
  const cutoff = hari ? deps.now().getTime() - Math.min(7, hari) * DAY : 0;
  const own = ownName(ch);
  const posts = await deps.th("GET", `/${ch.threads_user_id}/threads`, { query: { fields: "id,text,timestamp", limit: String(n) } });
  if (posts.status !== 200) return err(igError(posts.json, "Gagal membaca postingan Threads", IZIN_TH));
  const dibalas = await deps.log.done(ch.id, "threads_reply");
  const out = [];
  for (const p of posts.json.data || []) {
    const r = await deps.th("GET", `/${p.id}/replies`, { query: { fields: "id,text,username,timestamp,is_reply_owned_by_me" } });
    if (r.status !== 200) return err(igError(r.json, "Gagal membaca komentar Threads", IZIN_TH));
    for (const c of r.json.data || []) {
      if (c.is_reply_owned_by_me || uname(c.username) === own || Date.parse(c.timestamp) < cutoff) continue;
      out.push({ reply_id: c.id, username: c.username || null, teks: c.text || "", waktu: c.timestamp, post_id: p.id, cuplikan_postingan: (p.text || "").slice(0, 80), sudah_dibalas: dibalas.has(c.id) });
    }
  }
  out.sort((a, b) => Date.parse(b.waktu) - Date.parse(a.waktu));
  return { akun: ch.handle, jumlah: out.length, komentar: out };
}

async function thPosting(args, deps) {
  const bad = cekTeks(args.teks, 500);
  if (bad) return err(bad);
  const teks = args.teks.trim();
  const key = `post:${crypto.createHash("sha256").update(teks).digest("hex").slice(0, 16)}`;
  return aksiTulis({ kind: "threads_post", key, teks, deps, izin: IZIN_TH,
    kirim: () => thTerbit(deps, { text: teks }),
    dobel: "Teks yang persis sama sudah pernah diposting ke Threads.", gagal: "Gagal memposting ke Threads" });
}

// Satu tool untuk dua kasus: komentar di postingan Tetra (bebas, 60/hari) atau
// postingan orang lain (nimbrung: 300 karakter, 8/hari, kompetitor ditolak).
// Pemilik utas dilihat dari root_post; tanpa root_post = target itu sendiri postingan utama.
async function thBalas(args, deps) {
  const ch = deps.channel;
  const rid = cekId(args.reply_id ?? args.reply_to_id);
  if (!rid) return err("reply_id tidak valid.");
  const t = await deps.th("GET", `/${rid}`, { query: { fields: "id,username,permalink,root_post" } });
  if (t.status !== 200) return err(igError(t.json, "Postingan/komentar Threads tidak ditemukan", IZIN_TH));
  const own = ownName(ch);
  let pemilik = uname(t.json.username);
  if (t.json.root_post?.id && t.json.root_post.id !== rid) {
    const root = await deps.th("GET", `/${t.json.root_post.id}`, { query: { fields: "username" } });
    pemilik = uname(root.json?.username);
  }
  if (uname(t.json.username) === own) return err("Itu postingan/komentar Tetra sendiri.");
  const luar = pemilik !== own;
  if (luar) {
    const komp = await deps.kompetitor();
    if (komp.has(uname(t.json.username)) || komp.has(pemilik)) return err(`@${komp.has(pemilik) ? pemilik : uname(t.json.username)} ada di daftar kompetitor; jangan dibalas.`);
  }
  const bad = cekTeks(args.teks, luar ? 300 : 500);
  if (bad) return err(bad);
  const teks = args.teks.trim();
  const kind = luar ? "threads_reply_luar" : "threads_reply";
  return aksiTulis({ kind, key: rid, teks, deps, izin: IZIN_TH,
    extra: { target_username: t.json.username || null, target_url: t.json.permalink || null },
    kirim: () => thTerbit(deps, { text: teks, reply_to_id: rid }),
    dobel: "Postingan/komentar ini sudah pernah dibalas lewat Hermes.", gagal: "Gagal membalas di Threads" });
}

const PERINGATAN_CARI = "keyword_search belum disetujui App Review Meta — hasil hanya postingan Tetra sendiri.";

async function thCari(args, deps) {
  const ch = deps.channel;
  const q = typeof args.q === "string" ? args.q.trim() : "";
  if (!q) return err("q (kata kunci) wajib diisi.");
  const mode = args.mode === "TAG" ? "TAG" : "KEYWORD";
  const urutan = args.urutan === "RECENT" ? "RECENT" : "TOP";
  const n = Math.min(25, Math.max(1, Math.floor(+args.maks) || 10));
  const r = await deps.th("GET", "/keyword_search", { query: { q, search_type: urutan, search_mode: mode, limit: String(n), fields: "id,text,username,permalink,timestamp,has_replies" } });
  if (r.status !== 200) return err(igError(r.json, "Pencarian Threads gagal", "Izin pencarian (threads_keyword_search) belum diberikan — sambung ulang akun Threads Tetra di SinaraCast."));
  const own = ownName(ch);
  const [komp, a, b] = await Promise.all([deps.kompetitor(), deps.log.done(ch.id, "threads_reply_luar"), deps.log.done(ch.id, "threads_reply")]);
  const hasil = (r.json.data || []).map((p) => ({
    id: p.id, username: p.username || null, teks: p.text || "", permalink: p.permalink || null, waktu: p.timestamp,
    ada_balasan: !!p.has_replies, is_kompetitor: komp.has(uname(p.username)), milik_tetra: uname(p.username) === own,
    sudah_dibalas: a.has(p.id) || b.has(p.id),
  }));
  // Di Dev Mode / sebelum review, Meta hanya mengembalikan postingan milik akun sendiri.
  const cumaSendiri = hasil.every((h) => h.milik_tetra);
  return { q, mode, urutan, jumlah: hasil.length, hasil, ...(cumaSendiri ? { peringatan: PERINGATAN_CARI } : {}) };
}

async function thKompetitor(_args, deps) {
  return { kompetitor: [...(await deps.kompetitor())].sort().map((u) => `@${u}`) };
}

// Izin Threads tidak dilaporkan saat tukar token; izin kurang terlihat dari error API (→ IZIN_TH).
const withThreads = (fn) => (args, deps) => (thOk(deps.channel) ? fn(args, deps) : err(IZIN_TH));

const RUN = {
  ig_komentar: igKomentar, ig_balas_komentar: igBalas, ig_private_reply: igPrivateReply,
  threads_postingan_saya: withThreads(thPostingan), threads_komentar: withThreads(thKomentar),
  threads_posting: withThreads(thPosting), threads_balas: withThreads(thBalas),
  threads_cari: withThreads(thCari), threads_daftar_kompetitor: withThreads(thKompetitor),
};

export async function handleMcp(raw, deps) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail(null, -32600, "Invalid Request");
  const id = raw.id ?? null;
  const method = raw.method || "";
  const params = raw.params || {};
  if (method.startsWith("notifications/")) return { status: 202 };

  switch (method) {
    case "initialize":
      return ok(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "sinaracast-tetra", version: "1.1.0" },
        instructions: "Instagram + Threads @tetraphotobooth. Waktu dalam ISO UTC. Private reply IG hanya sekali per komentar dan ≤7 hari.",
      });
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: TOOLS });
    case "tools/call": {
      const name = String(params.name || "");
      const run = RUN[name];
      if (!run) return fail(id, -32602, `Unknown tool: ${name}`);
      if (!deps.channel) return toolResult(id, err(name.startsWith("threads_") ? "Akun Threads Tetra belum tersambung di SinaraCast (Manajemen Akun → Sambungkan Threads)." : "Channel Instagram Tetra belum tersambung di SinaraCast."));
      const args = params.arguments && typeof params.arguments === "object" ? params.arguments : {};
      try {
        return toolResult(id, await run(args, deps));
      } catch (e) {
        return toolResult(id, err(`Tool gagal: ${e?.message || e}`));
      }
    }
    default:
      return fail(id, -32601, `Method not found: ${method}`);
  }
}
