"use client";
import React from "react";
import { supabase } from "../../components/sinaracast/supabaseClient";

export const dynamic = "force-dynamic";

// Spike test harness for TikTok: connect an account, then prove the two publish
// primitives end-to-end (video FILE_UPLOAD = R1, photo PULL_FROM_URL = R2).
// Everything posts privately (SELF_ONLY) since the app isn't audited yet.
export default function SpikeTikTokPage() {
  const [session, setSession] = React.useState(null);
  const [log, setLog] = React.useState([]);
  const [busy, setBusy] = React.useState("");
  const [videoFile, setVideoFile] = React.useState(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  React.useEffect(() => {
    const onMsg = (ev) => {
      if (ev.origin !== window.location.origin) return;
      const d = ev.data;
      if (!d || d.type !== "sinara-oauth") return;
      add(d.status === "error" ? `❌ Connect gagal: ${d.error}` : `✅ TikTok ${d.status}: @${d.name}`);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const add = (line) => setLog((l) => [`${new Date().toLocaleTimeString()} — ${line}`, ...l]);

  const connect = async () => {
    const w = 600, h = 760;
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
    const popup = window.open("about:blank", "tt_oauth", `width=${w},height=${h},left=${left},top=${top}`);
    if (!popup) { add("❌ Popup diblokir — izinkan popup lalu coba lagi."); return; }
    try {
      popup.document.write('<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#f6f5fb;color:#8c909e">Menyiapkan otorisasi TikTok…</body>');
      const res = await fetch("/connect/tiktok/start", { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}` } });
      const j = await res.json().catch(() => ({}));
      if (!j.ok || !j.url) throw new Error(j.error || "Gagal memulai OAuth");
      popup.location.href = j.url;
      add("→ Membuka otorisasi TikTok…");
    } catch (e) {
      try { popup.close(); } catch {}
      add(`❌ ${e.message || e}`);
    }
  };

  // Upload the chosen video straight from the browser to Supabase storage
  // (bypasses Vercel's ~4.5MB request limit), then hand its path to the API.
  const uploadVideo = async (file) => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) throw new Error("Belum login");
    const { data: ch } = await supabase.from("channel").select("slug").eq("platform", "tiktok").is("archived_at", null).limit(1).maybeSingle();
    const slug = ch?.slug || "tiktok-spike";
    const ext = file.type === "video/quicktime" ? "mov" : "mp4";
    const path = `${uid}/${slug}/${crypto.randomUUID()}.${ext}`;
    add(`→ Upload video ke storage (${(file.size / 1e6).toFixed(1)} MB)…`);
    const { error } = await supabase.storage.from("pool-images").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(`Upload storage gagal: ${error.message}`);
    return path;
  };

  const test = async (kind) => {
    setBusy(kind);
    try {
      let storagePath;
      if (kind === "video") {
        if (!videoFile) { add("❌ Pilih file video dulu (mp4/mov, 9:16)."); setBusy(""); return; }
        storagePath = await uploadVideo(videoFile);
      }
      add(`→ Posting test ${kind} ke TikTok… (bisa makan ~30 dtk)`);
      const res = await fetch("/api/tiktok-test", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ kind, storagePath }),
      });
      const j = await res.json().catch(() => ({}));
      if (j.ok) add(`✅ ${kind} terbit (privat) — publish_id=${j.publishId} status=${j.status}`);
      else add(`❌ ${kind} gagal: ${j.error}${j.code ? ` [${j.code}]` : ""}`);
    } catch (e) {
      add(`❌ ${kind} error: ${e.message || e}`);
    } finally {
      setBusy("");
    }
  };

  const box = { padding: "10px 14px", borderRadius: 10, border: "1px solid #d8d6e6", background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 };

  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif", color: "#3e4351" }}>
      <h1>SinaraCast — Spike TikTok</h1>
      <p style={{ lineHeight: 1.7 }}>
        Buktikan <b>connect akun</b> + one-off <b>video</b> (FILE_UPLOAD) dan{" "}
        <b>foto/carousel</b> (PULL_FROM_URL) ke feed TikTok. Semua posting{" "}
        <b>privat (Only me)</b> karena app belum di-audit TikTok.
      </p>
      {!session && <p style={{ color: "#c0392b" }}>Belum login. Buka <a href="/">app SinaraCast</a> dan masuk dulu, lalu kembali ke sini.</p>}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "20px 0", alignItems: "center" }}>
        <button style={box} onClick={connect} disabled={!session}>1 · Sambungkan TikTok</button>
        <button style={box} onClick={() => test("video")} disabled={!session || !!busy}>2 · Posting test video</button>
        <button style={box} onClick={() => test("photo")} disabled={!session || !!busy}>3 · Posting test foto</button>
      </div>
      <div style={{ margin: "0 0 8px", fontSize: 13, color: "#5b6070" }}>
        Pilih file video untuk test (2): {" "}
        <input type="file" accept="video/mp4,video/quicktime" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
        {videoFile && <span style={{ color: "#2e7d32" }}> {videoFile.name}</span>}
      </div>

      <p style={{ fontSize: 13, color: "#8c909e", lineHeight: 1.6 }}>
        Catatan: test memakai media yang sudah di-upload ke akun TikTok ini lewat app
        (video 9:16 untuk test video; 1–10 gambar untuk test foto). Foto kemungkinan gagal{" "}
        <code>url_ownership_unverified</code> sampai domain media diverifikasi di TikTok — itu temuan spike (R2).
      </p>

      <h3 style={{ marginTop: 28 }}>Log</h3>
      <pre style={{ background: "#0f1117", color: "#d6e2ff", padding: 14, borderRadius: 10, fontSize: 12.5, lineHeight: 1.7, whiteSpace: "pre-wrap", minHeight: 80 }}>
        {log.length ? log.join("\n") : "(belum ada)"}
      </pre>
      <p style={{ marginTop: 24, color: "#888" }}>← <a href="/">SinaraCast app</a></p>
    </main>
  );
}
