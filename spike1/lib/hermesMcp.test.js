// node --test lib/hermesMcp.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { handleMcp, startOfDayWib } from "./hermesMcp.js";

const NOW = new Date("2026-10-02T05:00:00Z");
const ago = (d) => new Date(NOW.getTime() - d * 86400000).toISOString();
const FULL = ["instagram_business_basic", "instagram_business_manage_comments", "instagram_business_manage_messages"];

function fake({ scopes = FULL } = {}) {
  const rows = [];
  const comments = {
    "111": { id: "111", text: "PL dong", timestamp: ago(1), username: "budi", from: { id: "9" } },
    "222": { id: "222", text: "lama", timestamp: ago(9), username: "sari", from: { id: "8" } },
    "333": { id: "333", text: "makasih", timestamp: ago(0.5), username: "tetraphotobooth", from: { id: "42" } },
  };
  const sent = [];
  return {
    sent, rows,
    deps: {
      channel: { id: "ch", owner_id: "o", ig_user_id: "42", handle: "@tetraphotobooth", ig_scopes: scopes },
      now: () => NOW,
      ig: async (method, path, opts) => {
        if (path === "/42/media") return { status: 200, json: { data: [{ id: "m1", caption: "Photobooth wedding", comments_count: 3 }] } };
        if (path === "/m1/comments") return { status: 200, json: { data: Object.values(comments) } };
        if (method === "GET" && comments[path.slice(1)]) return { status: 200, json: comments[path.slice(1)] };
        if (method === "POST") { sent.push({ path, opts }); return { status: 200, json: { id: `r${sent.length}` } }; }
        return { status: 400, json: { error: { message: "?" } } };
      },
      log: {
        done: async (_, kind) => new Set(rows.filter((r) => r.kind === kind && r.result_id).map((r) => r.comment_id)),
        countSince: async (_, kind, iso) => rows.filter((r) => r.kind === kind && r.at >= iso).length,
        claim: async (row) => (rows.some((r) => r.comment_id === row.comment_id && r.kind === row.kind) ? false : (rows.push({ ...row, at: NOW.toISOString() }), true)),
        release: async (_, cid, kind) => { const i = rows.findIndex((r) => r.comment_id === cid && r.kind === kind && !r.result_id); if (i >= 0) rows.splice(i, 1); },
        finish: async (_, cid, kind, rid) => { rows.find((r) => r.comment_id === cid && r.kind === kind).result_id = rid; },
      },
    },
  };
}

const call = async (deps, name, args) => {
  const r = await handleMcp({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }, deps);
  return { isError: r.body.result.isError, data: JSON.parse(r.body.result.content[0].text) };
};

test("tools/list: semua tool dengan anotasi benar", async () => {
  const r = await handleMcp({ jsonrpc: "2.0", id: 1, method: "tools/list" }, fake().deps);
  const t = Object.fromEntries(r.body.result.tools.map((x) => [x.name, x.annotations.readOnlyHint]));
  assert.deepEqual(t, { ig_komentar: true, ig_balas_komentar: false, ig_private_reply: false,
    threads_postingan_saya: true, threads_komentar: true, threads_posting: false, threads_balas: false });
});

test("tanpa izin komentar → error sambung ulang", async () => {
  const f = fake({ scopes: null });
  for (const [n, a] of [["ig_komentar", {}], ["ig_balas_komentar", { comment_id: "111", teks: "hai" }], ["ig_private_reply", { comment_id: "111", teks: "hai" }]]) {
    const r = await call(f.deps, n, a);
    assert.equal(r.isError, true);
    assert.match(r.data.error, /sambung ulang channel Tetra/);
  }
});

test("ig_komentar: buang komentar sendiri dan yang di luar rentang", async () => {
  const { data } = await call(fake().deps, "ig_komentar", { hari: 3 });
  assert.deepEqual(data.komentar.map((c) => c.comment_id), ["111"]);
  assert.equal(data.komentar[0].bisa_private_reply, true);
  assert.equal(data.komentar[0].sudah_dibalas, false);
});

test("private reply: kedua ditolak, >7 hari ditolak, link pendek ditolak", async () => {
  const f = fake();
  const a = await call(f.deps, "ig_private_reply", { comment_id: "111", teks: "Halo kak, ini pricelist-nya" });
  assert.equal(a.isError, false);
  assert.deepEqual(f.sent[0].opts.body.recipient, { comment_id: "111" });
  const b = await call(f.deps, "ig_private_reply", { comment_id: "111", teks: "lagi" });
  assert.match(b.data.error, /sudah pernah dikirim/);
  const c = await call(f.deps, "ig_private_reply", { comment_id: "222", teks: "halo" });
  assert.match(c.data.error, /lebih dari 7 hari/);
  const d = await call(f.deps, "ig_private_reply", { comment_id: "111", teks: "cek bit.ly/abc" });
  assert.match(d.data.error, /link pendek/);
  assert.equal(f.sent.length, 1);
  const k = await call(f.deps, "ig_komentar", {});
  assert.equal(k.data.komentar[0].private_reply_terkirim, true);
  assert.equal(k.data.komentar[0].bisa_private_reply, false);
});

test("balasan publik: idempoten, batas 300 karakter, batas harian", async () => {
  const f = fake();
  assert.equal((await call(f.deps, "ig_balas_komentar", { comment_id: "111", teks: "Cek DM ya kak" })).isError, false);
  assert.match((await call(f.deps, "ig_balas_komentar", { comment_id: "111", teks: "lagi" })).data.error, /sudah pernah dibalas/);
  assert.match((await call(f.deps, "ig_balas_komentar", { comment_id: "112", teks: "x".repeat(301) })).data.error, /300/);
  for (let i = 0; i < 59; i++) f.rows.push({ kind: "reply", comment_id: `x${i}`, at: NOW.toISOString(), result_id: "r" });
  assert.match((await call(f.deps, "ig_balas_komentar", { comment_id: "113", teks: "hai" })).data.error, /Batas harian/);
});

test("Instagram menolak → klaim dibatalkan, bisa dicoba lagi", async () => {
  const f = fake();
  const ig = f.deps.ig;
  f.deps.ig = async (m, p, o) => (m === "POST" ? { status: 400, json: { error: { code: 10, message: "no permission" } } } : ig(m, p, o));
  assert.match((await call(f.deps, "ig_balas_komentar", { comment_id: "111", teks: "hai" })).data.error, /sambung ulang/);
  assert.equal(f.rows.length, 0);
});

test("awal hari WIB", () => {
  assert.equal(startOfDayWib(new Date("2026-10-02T18:00:00Z")), "2026-10-02T17:00:00.000Z");
  assert.equal(startOfDayWib(new Date("2026-10-02T05:00:00Z")), "2026-10-01T17:00:00.000Z");
});

function fakeThreads() {
  const f = fake();
  const calls = [];
  f.deps.channel = { id: "th", owner_id: "o", platform: "threads", threads_user_id: "77", handle: "@tetraphotobooth" };
  f.deps.th = async (method, path, opts) => {
    calls.push({ method, path, q: opts?.query });
    if (path === "/77/threads" && method === "GET") return { status: 200, json: { data: [{ id: "p1", text: "Sewa photobooth Bogor", timestamp: ago(1) }] } };
    if (path === "/p1/replies") return { status: 200, json: { data: [
      { id: "501", text: "harga?", username: "andi", timestamp: ago(0.2) },
      { id: "502", text: "cek DM", username: "tetraphotobooth", timestamp: ago(0.1) },
      { id: "503", text: "lama", username: "rina", timestamp: ago(5) },
    ] } };
    if (path === "/77/threads" && method === "POST") return { status: 200, json: { id: `c${calls.length}` } };
    if (path === "/77/threads_publish") return { status: 200, json: { id: `pub${calls.length}` } };
    return { status: 400, json: { error: { message: "?" } } };
  };
  return { ...f, calls };
}

test("threads_komentar: buang milik sendiri dan di luar rentang", async () => {
  const { data } = await call(fakeThreads().deps, "threads_komentar", { hari: 3 });
  assert.deepEqual(data.komentar.map((c) => c.reply_id), ["501"]);
});

test("threads_posting: dua langkah, teks sama ditolak", async () => {
  const f = fakeThreads();
  const a = await call(f.deps, "threads_posting", { teks: "Photobooth unlimited Bogor!" });
  assert.equal(a.isError, false);
  assert.deepEqual(f.calls.map((c) => c.path), ["/77/threads", "/77/threads_publish"]);
  assert.match((await call(f.deps, "threads_posting", { teks: "Photobooth unlimited Bogor!" })).data.error, /sudah pernah diposting/);
});

test("threads_balas: reply_to_id terpasang, idempoten", async () => {
  const f = fakeThreads();
  assert.equal((await call(f.deps, "threads_balas", { reply_id: "501", teks: "Halo kak, cek DM ya" })).isError, false);
  assert.equal(f.calls[0].q.reply_to_id, "501");
  assert.match((await call(f.deps, "threads_balas", { reply_id: "501", teks: "lagi" })).data.error, /sudah pernah dibalas/);
});

test("tool threads dengan channel bukan Threads → minta sambung ulang", async () => {
  assert.match((await call(fake().deps, "threads_komentar", {})).data.error, /akun Threads/);
});
