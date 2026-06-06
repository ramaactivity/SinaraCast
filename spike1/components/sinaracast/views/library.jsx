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
const IMG_MAXDIM = 1920, IMG_LIMIT = 8 * 1024 * 1024;
// Downscale very large images + always output JPEG (gallery keeps the original
// aspect — no crop here; cropping happens later when a post is composed).
function prepareImage(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const scale = Math.min(1, IMG_MAXDIM / Math.max(iw, ih));
      const ow = Math.max(1, Math.round(iw * scale)), oh = Math.max(1, Math.round(ih * scale));
      const canvas = document.createElement("canvas");
      canvas.width = ow; canvas.height = oh;
      canvas.getContext("2d").drawImage(img, 0, 0, ow, oh);
      URL.revokeObjectURL(url);
      const toBlobQ = (q) => new Promise((r) => canvas.toBlob((b) => r(b), "image/jpeg", q));
      (async () => {
        for (const q of [0.92, 0.85, 0.75, 0.65, 0.55]) {
          const blob = await toBlobQ(q);
          if (blob && (blob.size <= IMG_LIMIT || q === 0.55)) {
            const out = new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
            return res({ file: out, width: ow, height: oh, shrunk: out.size < file.size });
          }
        }
        rej(new Error("encode"));
      })();
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("read")); };
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
  // Reset filters when the active account changes (tags differ per account).
  React.useEffect(() => { setTag("all"); setQ(""); }, [chId]);
  const fileRef = useRef(null);

  const all = app.library?.[chId] || [];
  const tags = [...new Set(all.map(it => it.tag).filter(Boolean))];
  const ql = q.trim().toLowerCase();
  const items = all.filter(it => (tag === "all" || it.tag === tag) && (!ql || (it.tag || "").toLowerCase().includes(ql) || (it.usage || "").toLowerCase().includes(ql)));

  async function onFiles(e) {
    const files = [...(e.target.files || [])]; e.target.value = "";
    if (!channel) { app.toast("Pilih akun dulu", "error"); return; }
    for (const file of files) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { app.toast("Hanya gambar JPG / PNG / WebP", "error"); continue; }
      if (file.size > 40 * 1024 * 1024) { app.toast("Gambar terlalu besar (maks 40 MB)", "error"); continue; }
      setUploading(true);
      let up;
      try { up = await prepareImage(file); if (up.shrunk) app.toast("Gambar dikompres otomatis agar muat", "info"); }
      catch { app.toast("Gagal menyiapkan gambar", "error"); setUploading(false); continue; }
      try { await uploadLibraryMedia(up.file, chId, channel._id, { width: up.width, height: up.height }); app.toast("Media diunggah ✓", "success"); }
      catch (err) { app.toast("Gagal unggah: " + (err.message || err), "error"); }
      finally { setUploading(false); }
    }
    await app.reload();
  }

  if (!channel) {
    return <div><Topbar title="Galeri" /><Panel pad={0}><EmptyState icon={<Icons.image size={28} />} title="Belum ada akun" body="Sambungkan akun dulu untuk mengelola gambar." /></Panel></div>;
  }

  return (
    <div>
      <Topbar title="Galeri" sub={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><BrandAvatar brand={b} size={18} /> {b.name} · gambar yang bisa dipakai ulang</span>}
        right={<Button variant="amber" icon={uploading ? <Spinner size={15} /> : <Icons.upload size={17} />} disabled={uploading} onClick={() => fileRef.current?.click()}>Unggah</Button>} />
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onFiles} style={{ display: "none" }} />

      <Panel>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, maxWidth: 320, minWidth: 200 }}><Input icon={<Icons.search size={18} />} placeholder="Cari berdasarkan label…" value={q} onChange={e => setQ(e.target.value)} /></div>
          {tags.length > 0 && <Segmented options={[{ value: "all", label: "Semua" }, ...tags.map(t => ({ value: t, label: t }))]} value={tag} onChange={setTag} />}
        </div>

        {phase === "loading" && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 12 }}>{Array.from({ length: 16 }).map((_, i) => <Skeleton key={i} h={120} r={12} />)}</div>}

        {phase === "ready" && items.length === 0 && <EmptyState compact icon={<Icons.image size={26} />} title={all.length === 0 ? "Belum ada gambar" : "Tidak ada gambar yang cocok"} body={all.length === 0 ? "Unggah gambar, atau buat jadwal/postingan. Semua gambar akun ini muncul di sini." : "Ganti filter atau kata kunci."} />}

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
