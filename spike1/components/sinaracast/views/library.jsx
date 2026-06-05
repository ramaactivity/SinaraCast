"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Topbar } from "../shell";
import { uploadLibraryMedia } from "../dataLayer";
import { BRANDS, BrandAvatar, Panel, Button, Input, MediaThumb, EmptyState, Skeleton, Segmented, Spinner } from "../ui";
const { useState: uLi, useRef } = React;
const FLi = "var(--font)";

const brandFor = (slug, channels) => BRANDS[slug] || {
  name: channels.find(c => c.id === slug)?.name || slug,
  short: (channels.find(c => c.id === slug)?.name || slug || "?").slice(0, 2).toUpperCase(),
  accent: "var(--ink-500)", soft: "var(--line)", grad: "linear-gradient(135deg,#9aa0ab,#7a8090)",
};
function readDims(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { res({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { rej(new Error("read")); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

export function MediaLibraryView() {
  const app = useApp();
  const phase = app.dataLoading ? "loading" : "ready";
  const chId = app.params.ch || app.channel;
  const channel = app.channels.find(c => c.id === chId);
  const b = brandFor(chId, app.channels);
  const [q, setQ] = uLi("");
  const [tag, setTag] = uLi("all");
  const [uploading, setUploading] = uLi(false);
  const fileRef = useRef(null);

  const all = app.library?.[chId] || [];
  const tags = [...new Set(all.map(it => it.tag).filter(Boolean))];
  const ql = q.trim().toLowerCase();
  const items = all.filter(it => (tag === "all" || it.tag === tag) && (!ql || (it.tag || "").toLowerCase().includes(ql) || (it.usage || "").toLowerCase().includes(ql)));

  async function onFiles(e) {
    const files = [...(e.target.files || [])]; e.target.value = "";
    if (!channel) { app.toast("Pilih channel dulu", "error"); return; }
    for (const file of files) {
      if (!["image/jpeg", "image/png"].includes(file.type)) { app.toast("Hanya JPG / PNG", "error"); continue; }
      if (file.size > 8 * 1024 * 1024) { app.toast("Maksimal 8 MB", "error"); continue; }
      let dim; try { dim = await readDims(file); } catch { app.toast("Gagal membaca gambar", "error"); continue; }
      setUploading(true);
      try { await uploadLibraryMedia(file, chId, channel._id, dim); app.toast("Media diunggah ✓", "success"); }
      catch (err) { app.toast("Gagal unggah: " + (err.message || err), "error"); }
      finally { setUploading(false); }
    }
    await app.reload();
  }

  if (!channel) {
    return <div><Topbar title="Media Library" /><Panel pad={0}><EmptyState icon={<Icons.image size={28} />} title="Belum ada channel" body="Sambungkan channel dulu untuk mengelola media." /></Panel></div>;
  }

  return (
    <div>
      <Topbar title="Media Library" sub={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><BrandAvatar brand={b} size={18} /> {b.name} · media dapat dipakai ulang</span>}
        right={<Button variant="amber" icon={uploading ? <Spinner size={15} /> : <Icons.upload size={17} />} disabled={uploading} onClick={() => fileRef.current?.click()}>Unggah</Button>} />
      <input ref={fileRef} type="file" accept="image/jpeg,image/png" multiple onChange={onFiles} style={{ display: "none" }} />

      <Panel>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, maxWidth: 320, minWidth: 200 }}><Input icon={<Icons.search size={18} />} placeholder="Cari berdasarkan tag/rule…" value={q} onChange={e => setQ(e.target.value)} /></div>
          {tags.length > 0 && <Segmented options={[{ value: "all", label: "Semua" }, ...tags.map(t => ({ value: t, label: t }))]} value={tag} onChange={setTag} />}
        </div>

        {phase === "loading" && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 12 }}>{Array.from({ length: 16 }).map((_, i) => <Skeleton key={i} h={120} r={12} />)}</div>}

        {phase === "ready" && items.length === 0 && <EmptyState compact icon={<Icons.image size={26} />} title={all.length === 0 ? "Belum ada media" : "Tidak ada media dengan filter ini"} body={all.length === 0 ? "Unggah gambar atau buat rule/one-off — semua media channel ini muncul di sini." : "Ganti filter atau kata kunci."} />}

        {phase === "ready" && items.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 12 }}>
            {items.map(it => (
              <div key={it.id} style={{ position: "relative" }}>
                <MediaThumb seed={0} src={it.url} w={"100%"} ratio={1.4} />
                <div style={{ position: "absolute", left: 6, bottom: 6, right: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: FLi, fontSize: 8.5, fontWeight: 600, color: "#fff", background: "rgba(62,67,81,.6)", padding: "1px 6px", borderRadius: 999, backdropFilter: "blur(4px)" }}>{it.tag}</span>
                </div>
                {it.usage && <span style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,.9)", color: b.accent, display: "grid", placeItems: "center" }} title={`Dipakai: ${it.usage}`}><Icons.link size={11} /></span>}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
