"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Topbar } from "../shell";
import { uploadPoolImage, uploadReelVideo, createScheduledPost, loadScheduledPost, updateScheduledPost, deleteScheduledPost } from "../dataLayer";
import { BRANDS, BrandAvatar, Panel, Button, Field, Textarea, TimeField, Segmented, MediaThumb, SectionTitle, Spinner, Chip, Input, Select, Status } from "../ui";
import { Lightbox } from "../lightbox";
const { useState: uCo, useRef, useEffect } = React;
const FCo = "var(--font)";
const MAX_VIDEO_MB = 50;
function readVideoMeta(file) {
  return new Promise((res, rej) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    v.preload = "metadata";
    v.onloadedmetadata = () => { res({ width: v.videoWidth, height: v.videoHeight, duration: v.duration }); URL.revokeObjectURL(url); };
    v.onerror = () => { rej(new Error("read")); URL.revokeObjectURL(url); };
    v.src = url;
  });
}

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
const IMG_MAXDIM = 1920;          // longest side after processing (IG re-encodes anyway)
const IMG_LIMIT = 8 * 1024 * 1024; // Instagram's per-image limit

// Prepare a photo for Instagram the way the IG app does: optionally center-crop to
// a target ratio, downscale very large images, always output JPEG (IG only accepts
// JPEG), and step quality down until it fits the 8 MB limit. Returns the new File +
// final dimensions + flags so the caller can explain what happened.
function prepareImage(file, cropRatio) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const iw = img.naturalWidth, ih = img.naturalHeight;
      let cw = iw, ch = ih, sx = 0, sy = 0, cropped = false;
      if (cropRatio) {
        cw = iw; ch = Math.round(iw / cropRatio);
        if (ch > ih) { ch = ih; cw = Math.round(ih * cropRatio); }
        sx = Math.round((iw - cw) / 2); sy = Math.round((ih - ch) / 2);
        cropped = cw !== iw || ch !== ih;
      }
      const scale = Math.min(1, IMG_MAXDIM / Math.max(cw, ch));
      const ow = Math.max(1, Math.round(cw * scale)), oh = Math.max(1, Math.round(ch * scale));
      const canvas = document.createElement("canvas");
      canvas.width = ow; canvas.height = oh;
      canvas.getContext("2d").drawImage(img, sx, sy, cw, ch, 0, 0, ow, oh);
      URL.revokeObjectURL(url);
      const toBlobQ = (q) => new Promise((r) => canvas.toBlob((b) => r(b), "image/jpeg", q));
      (async () => {
        for (const q of [0.92, 0.85, 0.75, 0.65, 0.55]) {
          const blob = await toBlobQ(q);
          if (blob && (blob.size <= IMG_LIMIT || q === 0.55)) {
            const out = new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
            return res({ file: out, width: ow, height: oh, cropped, shrunk: out.size < file.size && !cropped });
          }
        }
        rej(new Error("encode"));
      })();
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("read")); };
    img.src = url;
  });
}
const isVid = (m) => !!(m && (m.isVideo || ["mp4", "mov"].includes(m.format) || /\.(mp4|mov)(\?|$)/i.test(m.url || "")));
const pad = (n) => String(n).padStart(2, "0");
const todayWib = () => { const d = new Date(Date.now() + 7 * 3600 * 1000); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
const isoToWibParts = (iso) => { const d = new Date(new Date(iso).getTime() + 7 * 3600 * 1000); return { date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` }; };

export function ComposerView() {
  const app = useApp();
  const postId = app.params.postId || null; // present → edit mode
  const [chId, setChId] = uCo(app.params.ch || app.channel);
  const channel = app.channels.find(c => c.id === chId) || app.channels.find(c => c.id === app.channel) || app.channels[0];
  const b = brandFor(channel?.id, app.channels);

  const [type, setType] = uCo(channel?.platform === "tiktok" ? "tiktok_video" : "story");
  const [media, setMedia] = uCo([]); // [{ storage_path, url, width, height, format, bytes, aspect_ok, assetId? }]
  const [caption, setCaption] = uCo("");
  const [firstComment, setFirstComment] = uCo("");
  const [date, setDate] = uCo(todayWib());
  const [time, setTime] = uCo("09:00");
  const [uploading, setUploading] = uCo(false);
  const [saving, setSaving] = uCo(false);
  const [loading, setLoading] = uCo(!!postId);
  const [origStatus, setOrigStatus] = uCo(null); // existing status when editing
  // TikTok-only Direct Post compliance options (TikTok UX guidelines).
  const [tk, setTk] = uCo({ privacy: "SELF_ONLY", allowComment: true, allowDuet: true, allowStitch: true, commercial: false, yourBrand: false, branded: false, musicOk: false });
  const [tkInfo, setTkInfo] = uCo(null); // creator_info: { audited, privacyOptions, commentDisabled, duetDisabled, stitchDisabled, username }
  const setTkField = (k, v) => setTk((s) => ({ ...s, [k]: v }));
  const [view, setView] = uCo(null); // lightbox index, or null
  const fileRef = useRef(null);
  const replaceIdxRef = useRef(null); // when set, the next upload replaces this media index
  function startReplace(idx) { replaceIdxRef.current = idx; fileRef.current?.click(); }

  // Load existing one-off when editing.
  useEffect(() => {
    if (!postId) return;
    let active = true;
    loadScheduledPost(postId).then(({ post, media: m }) => {
      if (!active || !post) { if (active) setLoading(false); return; }
      setType(["feed", "reels", "tiktok_video"].includes(post.post_type) ? post.post_type : "story");
      setCaption(post.caption || "");
      setFirstComment(post.first_comment || "");
      setOrigStatus(post.status);
      const o = post.tiktok_options || {};
      if (post.post_type === "tiktok_video") setTk((s) => ({ ...s, privacy: o.privacy_level || "SELF_ONLY", allowComment: o.allow_comment !== false, allowDuet: o.allow_duet !== false, allowStitch: o.allow_stitch !== false, commercial: !!o.commercial_content, yourBrand: !!o.your_brand, branded: !!o.branded_content, musicOk: !!o.music_ok }));
      if (post.scheduled_at) { const p = isoToWibParts(post.scheduled_at); setDate(p.date); setTime(p.time); }
      setMedia(m || []);
      setLoading(false);
    }).catch(() => active && setLoading(false));
    return () => { active = false; };
  }, [postId]);

  // Keep the post type in sync with the selected channel's platform, and load the
  // TikTok account's creator_info (allowed privacy + disabled interactions).
  useEffect(() => {
    if (postId) return; // edit mode keeps the saved type
    if (isTikTok && type !== "tiktok_video") setType("tiktok_video");
    if (!isTikTok && type === "tiktok_video") setType("story");
    if (!isTikTok) { setTkInfo(null); return; }
    let active = true;
    setTkInfo(null);
    fetch("/api/tiktok-creator-info", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${app.session?.access_token}` }, body: JSON.stringify({ channelDbId: channel._id }) })
      .then((r) => r.json()).then((j) => { if (active) setTkInfo(j); })
      .catch(() => active && setTkInfo({ ok: false }));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chId, isTikTok]);

  const isTikTok = channel?.platform === "tiktok";
  const isFeed = type === "feed";
  const isReels = type === "reels";
  const isTikVid = type === "tiktok_video";
  const isVideoType = isReels || isTikVid; // both upload a single 9:16 video
  const hasCaption = isFeed || isReels || isTikVid;
  const capLimit = 2200;
  const overCap = caption.length > capLimit;
  const audited = !!tkInfo?.audited;
  // TikTok compliance gates: must confirm music usage; if commercial, must pick a
  // disclosure; branded content can't be private.
  const tkValid = !isTikVid || (tk.musicOk && (!tk.commercial || tk.yourBrand || tk.branded) && !(tk.branded && tk.privacy === "SELF_ONLY"));
  // Feed needs a caption; others optional. All need media.
  const valid = media.length > 0 && !overCap && (!isFeed || caption.trim()) && tkValid;
  // Postingan yang sudah terbit tidak bisa dijadwalkan ulang (cegah terbit dua kali).
  const locked = !!postId && ["published", "publishing"].includes(origStatus);

  if (!channel) {
    return (
      <div>
        <Topbar title="Buat Postingan" />
        <Panel pad={0}><div style={{ padding: 40, textAlign: "center", fontFamily: FCo, color: "var(--ink-400)" }}>Sambungkan akun Instagram atau TikTok dulu sebelum membuat postingan.<div style={{ marginTop: 14 }}><Button variant="secondary" onClick={() => app.go("connections")}>Buka Manajemen Akun</Button></div></div></Panel>
      </div>
    );
  }

  async function onFiles(e) {
    const files = [...(e.target.files || [])]; e.target.value = "";
    let rep = replaceIdxRef.current; replaceIdxRef.current = null; // replace this slot (Feed); single types replace inherently
    for (const file of files) {
      if (isVideoType) {
        if (!["video/mp4", "video/quicktime"].includes(file.type)) { app.toast("Video harus MP4/MOV", "error"); continue; }
        if (file.size > MAX_VIDEO_MB * 1024 * 1024) { app.toast(`Video maksimal ${MAX_VIDEO_MB} MB`, "error"); continue; }
        let meta; try { meta = await readVideoMeta(file); } catch { app.toast("Gagal membaca video", "error"); continue; }
        const vr = meta.width / meta.height;
        if (Math.abs(vr - 9 / 16) > 0.06) app.toast(isTikVid ? "Video bukan 9:16 — TikTok mungkin menyesuaikan" : "Video bukan 9:16 — Instagram akan menyesuaikan (tambah bilah hitam)", "info");
        if (isTikVid && meta.duration && meta.duration < 3) { app.toast("Video TikTok minimal 3 detik", "error"); continue; }
        const maxSec = isTikVid ? (tkInfo?.maxVideoSec || 600) : 900;
        if (meta.duration && meta.duration > maxSec) { app.toast(isTikVid ? `Video TikTok maksimal ${Math.floor(maxSec / 60)} menit` : "Reels maksimal 15 menit", "error"); continue; }
        setUploading(true);
        try { const row = await uploadReelVideo(file, channel.id, meta); setMedia([row]); app.toast("Video diunggah ✓", "success"); }
        catch (err) { app.toast("Gagal unggah: " + (err.message || err), "error"); }
        finally { setUploading(false); }
        continue;
      }
      // Story can be an image OR a video.
      if (type === "story" && ["video/mp4", "video/quicktime"].includes(file.type)) {
        if (file.size > MAX_VIDEO_MB * 1024 * 1024) { app.toast(`Video maksimal ${MAX_VIDEO_MB} MB`, "error"); continue; }
        let meta; try { meta = await readVideoMeta(file); } catch { app.toast("Gagal membaca video", "error"); continue; }
        if (Math.abs(meta.width / meta.height - 9 / 16) > 0.06) app.toast("Video bukan 9:16 — Instagram akan menyesuaikan", "info");
        if (meta.duration && meta.duration > 60) { app.toast("Story video maksimal 60 detik (batas Instagram)", "error"); continue; }
        setUploading(true);
        try { const row = await uploadReelVideo(file, channel.id, meta); setMedia([row]); app.toast("Video diunggah ✓", "success"); }
        catch (err) { app.toast("Gagal unggah: " + (err.message || err), "error"); }
        finally { setUploading(false); }
        continue;
      }
      if (isFeed && rep == null && media.length >= 10) { app.toast("Carousel maksimal 10 gambar", "info"); break; }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { app.toast("Hanya gambar JPG / PNG / WebP", "error"); continue; }
      if (file.size > 40 * 1024 * 1024) { app.toast("Gambar terlalu besar (maks 40 MB)", "error"); continue; }
      let dim; try { dim = await readDims(file); } catch { app.toast("Gagal membaca gambar", "error"); continue; }
      // Instagram accepts any photo and crops/compresses it. Mirror that: auto
      // center-crop to a supported ratio (Story 9:16; Feed clamp 4:5..1.91:1),
      // shrink huge files, and always output JPEG — instead of rejecting.
      const ratio = dim.width / dim.height;
      const cropRatio = isFeed
        ? (ratio < 0.8 ? 0.8 : ratio > 1.91 ? 1.91 : null)
        : (Math.abs(ratio - 9 / 16) > 0.04 ? 9 / 16 : null);
      let upFile, upDim;
      setUploading(true);
      try {
        const p = await prepareImage(file, cropRatio);
        upFile = p.file; upDim = { width: p.width, height: p.height };
        if (p.cropped) app.toast(isFeed ? "Gambar disesuaikan ke rasio Instagram" : "Gambar dipotong otomatis ke 9:16", "info");
        else if (p.shrunk) app.toast("Gambar dikompres otomatis agar muat", "info");
      } catch { app.toast("Gagal menyiapkan gambar", "error"); setUploading(false); continue; }
      try {
        const row = await uploadPoolImage(upFile, channel.id, upDim);
        setMedia(m => rep != null ? m.map((x, k) => (k === rep ? row : x)) : (isFeed ? [...m, row] : [row]));
        rep = null;
        app.toast("Gambar diunggah ✓", "success");
      } catch (err) { app.toast("Gagal unggah: " + (err.message || err), "error"); }
      finally { setUploading(false); }
    }
  }

  // Combine the WIB date + time into a UTC ISO timestamp.
  const scheduledISO = () => new Date(`${date}T${time}:00+07:00`).toISOString();

  async function save(status) {
    if (!valid) { app.toast("Lengkapi media" + (isFeed ? " & caption" : "") + " dulu", "error"); return; }
    setSaving(true);
    const tiktokOptions = isTikVid ? {
      privacy_level: audited ? tk.privacy : "SELF_ONLY",
      allow_comment: tk.allowComment && !tkInfo?.commentDisabled,
      allow_duet: tk.allowDuet && !tkInfo?.duetDisabled,
      allow_stitch: tk.allowStitch && !tkInfo?.stitchDisabled,
      commercial_content: tk.commercial,
      your_brand: tk.commercial && tk.yourBrand,
      branded_content: tk.commercial && tk.branded,
      music_ok: tk.musicOk,
    } : null;
    const payload = {
      channelDbId: channel._id, postType: type, caption: hasCaption ? caption.trim() : null,
      firstComment: (hasCaption && !isTikVid) ? firstComment.trim() : null, scheduledAtISO: scheduledISO(), status, images: media,
      tiktokOptions,
    };
    try {
      if (postId) await updateScheduledPost(postId, payload);
      else await createScheduledPost(payload);
      await app.reload();
      app.toast(postId ? "Perubahan disimpan" : (status === "scheduled" ? `Postingan dijadwalkan ${date} ${time} WIB` : "Disimpan sebagai draf"), "success");
      app.go("calendar");
    } catch (e) {
      app.toast("Gagal menyimpan: " + (e.message || e), "error");
    } finally { setSaving(false); }
  }

  function remove() {
    app.confirm({
      title: "Hapus postingan ini?", danger: true, confirmLabel: "Hapus",
      body: "Postingan terjadwal ini akan dibatalkan dan dihapus.",
      consequence: "Postingan tidak akan terbit. Tindakan ini tidak bisa dibatalkan.",
      onConfirm: async () => {
        try { await deleteScheduledPost(postId); await app.reload(); app.toast("Postingan dihapus", "success"); app.go("calendar"); }
        catch (e) { app.toast("Gagal menghapus: " + (e.message || e), "error"); }
      },
    });
  }

  if (loading) {
    return <div><Topbar title="Buat Postingan" /><Panel style={{ height: 280, display: "grid", placeItems: "center" }}><Spinner size={28} /></Panel></div>;
  }

  // This channel's one-off posts (drafts + scheduled), newest first, excluding the
  // one being edited — so you can see & jump to your queue without leaving this page.
  const myPosts = app.oneoffs
    .filter((o) => o.ch === channel.id && o.id !== postId)
    .map((o) => ({ ...o, _key: `${o.ym}-${pad(o.day)} ${o.time}` }))
    .sort((a, b) => b._key.localeCompare(a._key))
    .slice(0, 8);

  return (
    <div>
      <Topbar title={postId ? "Edit Postingan" : "Buat Postingan"} sub={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><BrandAvatar brand={b} src={channel.avatarUrl} size={18} /> {b.name} · {channel.handle}</span>}
        right={<div style={{ display: "flex", gap: 10 }}>
          <Button variant="ghost" icon={<Icons.chevLeft size={17} />} onClick={() => app.go("calendar")}>Kembali</Button>
          {postId && <Button variant="danger" icon={<Icons.trash size={15} />} disabled={saving} onClick={remove}>Hapus</Button>}
          <Button variant="secondary" icon={saving ? <Spinner size={15} /> : <Icons.layers size={16} />} disabled={saving || !media.length || locked} onClick={() => save("draft")}>Simpan draf</Button>
          <Button variant="primary" icon={saving ? <Spinner size={15} color="#fff" /> : <Icons.calendar size={16} />} disabled={!valid || saving || locked} onClick={() => save("scheduled")}>{postId ? "Simpan & jadwalkan" : "Jadwalkan"}</Button>
        </div>} />

      {locked && <div style={{ display: "flex", gap: 9, marginBottom: 16, background: "var(--green-100)", borderRadius: 12, padding: "11px 14px" }}>
        <Icons.checkCircle size={16} style={{ color: "var(--green-500)", flex: "0 0 auto", marginTop: 1 }} />
        <span style={{ fontFamily: FCo, fontSize: 12.5, color: "var(--ink-600)", lineHeight: 1.45 }}>Postingan ini sudah terbit, jadi tidak bisa dijadwalkan ulang. Kamu masih bisa menghapus catatannya.</span>
      </div>}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel>
            <SectionTitle sub="Pilih akun & jenis postingan">Akun & jenis</SectionTitle>
            {!postId && app.channels.length > 1 && (
              <Field label="Posting ke akun" style={{ marginBottom: 14 }}>
                <Select value={channel.id} onChange={(v) => { setChId(v); app.setChannel(v); setMedia([]); }}
                  options={app.channels.map(c => ({ value: c.id, label: `${c.name} · ${c.handle}` }))} />
              </Field>
            )}
            {isTikTok
              ? <Segmented full options={[{ value: "tiktok_video", label: "Video TikTok" }]} value="tiktok_video" onChange={() => {}} />
              : <Segmented full options={[{ value: "story", label: "Story" }, { value: "feed", label: "Feed" }, { value: "reels", label: "Reels" }]} value={type} onChange={(v) => { setType(v); setMedia([]); }} />}
            {isFeed && <div style={{ display: "flex", gap: 9, marginTop: 12, background: "var(--st-publishing-bg)", borderRadius: 11, padding: "10px 12px" }}>
              <Icons.info size={15} style={{ color: "var(--st-publishing)", flex: "0 0 auto", marginTop: 1 }} />
              <span style={{ fontFamily: FCo, fontSize: 11.5, color: "var(--ink-600)", lineHeight: 1.45 }}>Feed terbit otomatis: 1 gambar atau carousel 2–10 gambar. Ukuran 4:5 sampai 1.91:1. Komentar pertama diposting otomatis setelah feed terbit.</span>
            </div>}
            {isReels && <div style={{ display: "flex", gap: 9, marginTop: 12, background: "var(--st-publishing-bg)", borderRadius: 11, padding: "10px 12px" }}>
              <Icons.film size={15} style={{ color: "var(--st-publishing)", flex: "0 0 auto", marginTop: 1 }} />
              <span style={{ fontFamily: FCo, fontSize: 11.5, color: "var(--ink-600)", lineHeight: 1.45 }}>Reels terbit otomatis: 1 video tegak 9:16, format MP4/MOV, maks {MAX_VIDEO_MB} MB, durasi ≤ 15 menit. Caption & komentar pertama opsional.</span>
            </div>}
            {isTikVid && <div style={{ display: "flex", gap: 9, marginTop: 12, background: "var(--st-publishing-bg)", borderRadius: 11, padding: "10px 12px" }}>
              <Icons.film size={15} style={{ color: "var(--st-publishing)", flex: "0 0 auto", marginTop: 1 }} />
              <span style={{ fontFamily: FCo, fontSize: 11.5, color: "var(--ink-600)", lineHeight: 1.45 }}>Video TikTok terbit otomatis ke feed: 1 video tegak 9:16, MP4/MOV, maks {MAX_VIDEO_MB} MB. {audited ? "Atur privasi & izin di bawah." : "Selama akun belum lolos audit TikTok, video terbit privat (Hanya saya) dan akun harus disetel Private."}</span>
            </div>}
          </Panel>
          {isTikVid && <TikTokOptions tk={tk} setTkField={setTkField} info={tkInfo} audited={audited} valid={tkValid} />}
          <Panel>
            <SectionTitle sub={isVideoType ? "Satu video tegak 9:16" : isFeed ? "Sampai 10 gambar (carousel)" : "Satu gambar atau video tegak 9:16"} right={<Button size="sm" variant="secondary" icon={uploading ? <Spinner size={15} /> : <Icons.upload size={15} />} disabled={uploading} onClick={() => fileRef.current?.click()}>{(media.length >= 1 && (isVideoType || type === "story")) ? "Ganti" : "Unggah"}</Button>}>{isVideoType ? "Video" : isFeed ? "Gambar" : "Media"}</SectionTitle>
            <input ref={fileRef} type="file" accept={isVideoType ? "video/mp4,video/quicktime" : isFeed ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,video/mp4,video/quicktime"} multiple={isFeed} onChange={onFiles} style={{ display: "none" }} />
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {media.map((m, i) => (
                <div key={i} style={{ position: "relative" }}>
                  {isVid(m)
                    ? <div onClick={() => setView(i)} title="Klik untuk pratinjau" style={{ position: "relative", cursor: "zoom-in", lineHeight: 0 }}>
                        <video src={m.url} muted playsInline preload="metadata" style={{ width: 120, aspectRatio: "9/16", objectFit: "cover", borderRadius: 12, border: "1px solid var(--line)", background: "#000", display: "block" }} />
                        <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,.6)", pointerEvents: "none" }}><Icons.play size={26} /></span>
                      </div>
                    : <MediaThumb seed={i} src={m.url} w={isFeed ? 96 : 90} ratio={isFeed ? 1 : 16 / 9} label={isFeed ? "Feed" : "9:16"} onClick={() => setView(i)} />}
                  <button onClick={() => setMedia(ms => ms.filter((_, x) => x !== i))} aria-label="Hapus" style={{ position: "absolute", top: -7, right: -7, width: 22, height: 22, borderRadius: "50%", border: "none", cursor: "pointer", background: "#fff", color: "var(--danger)", boxShadow: "var(--shadow-sm)", display: "grid", placeItems: "center" }}><Icons.x size={13} sw={2.4} /></button>
                </div>
              ))}
              {!media.length && <div style={{ fontFamily: FCo, fontSize: 12.5, color: "var(--ink-400)", padding: "10px 2px" }}>{isVideoType ? "Belum ada video. Klik Unggah untuk menambahkan." : isFeed ? "Belum ada gambar. Klik Unggah untuk menambahkan." : "Belum ada media. Unggah gambar atau video."}</div>}
            </div>
          </Panel>

          {hasCaption && (
            <Panel>
              <SectionTitle sub={`${caption.length} / ${capLimit} karakter${(isReels || isTikVid) ? " · opsional" : ""}`}>Tulisan (caption)</SectionTitle>
              <Textarea placeholder={isTikVid ? "Tulis caption TikTok (opsional)…" : isReels ? "Tulis caption Reels (opsional)…" : "Tulis caption postingan…"} value={caption} invalid={overCap} onChange={e => setCaption(e.target.value)} style={{ minHeight: 120 }} />
              {overCap && <div style={{ fontFamily: FCo, fontSize: 11.5, color: "var(--danger)", marginTop: 6 }}>Kepanjangan, maksimal {capLimit} karakter.</div>}
              {!isTikVid && <Field label="Komentar pertama (untuk hashtag)" hint="Diposting otomatis di kolom komentar setelah postingan terbit." style={{ marginTop: 16 }}>
                <Textarea value={firstComment} onChange={e => setFirstComment(e.target.value)} style={{ minHeight: 64 }} placeholder="#hashtag …" />
              </Field>}
            </Panel>
          )}
        </div>

        {/* schedule + preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel strong>
            <SectionTitle sub="Waktu WIB">Kapan terbit</SectionTitle>
            <Field label="Tanggal"><Input type="date" value={date} min={todayWib()} onChange={e => setDate(e.target.value)} /></Field>
            <Field label="Jam" style={{ marginTop: 14 }}><TimeField value={time} onChange={setTime} /></Field>
            <div style={{ display: "flex", gap: 9, marginTop: 14, background: "var(--green-100)", borderRadius: 11, padding: "10px 12px" }}>
              <Icons.info size={15} style={{ color: "var(--green-500)", flex: "0 0 auto", marginTop: 1 }} />
              <span style={{ fontFamily: FCo, fontSize: 11.5, color: "var(--ink-600)", lineHeight: 1.45 }}>Terbit otomatis sekali di waktu yang kamu pilih. Dijamin tidak terbit dua kali.</span>
            </div>
          </Panel>
          <Panel>
            <SectionTitle sub="Perkiraan tampilan">Pratinjau</SectionTitle>
            <div style={{ display: "flex", justifyContent: "center" }}>
              {media.length === 0
                ? <MediaThumb seed={0} w={140} ratio={isFeed ? 1 : 16 / 9} label={isTikVid ? "TikTok 9:16" : isReels ? "Reels 9:16" : isFeed ? "Feed" : "Story 9:16"} />
                : isVid(media[0])
                  ? <div onClick={() => setView(0)} title="Klik untuk pratinjau" style={{ position: "relative", cursor: "zoom-in", lineHeight: 0 }}>
                      <video src={media[0].url} muted playsInline preload="metadata" style={{ width: 150, aspectRatio: "9/16", objectFit: "cover", borderRadius: 14, border: "1px solid var(--line)", background: "#000", display: "block" }} />
                      <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,.6)", pointerEvents: "none" }}><Icons.play size={30} /></span>
                    </div>
                  : <MediaThumb seed={0} src={media[0].url} w={140} ratio={isFeed ? 1 : 16 / 9} label={isTikVid ? "TikTok 9:16" : isReels ? "Reels 9:16" : isFeed ? "Feed" : "Story 9:16"} onClick={() => setView(0)} />}
            </div>
            {hasCaption && caption && <p style={{ fontFamily: FCo, fontSize: 12, color: "var(--ink-600)", lineHeight: 1.5, marginTop: 12, maxHeight: 70, overflow: "hidden" }}><b style={{ color: "var(--ink-900)" }}>{channel.handle.replace(/^@/, "")}</b> {caption}</p>}
          </Panel>
        </div>
      </div>

      <Panel style={{ marginTop: 18 }}>
        <SectionTitle sub="Draf & yang sudah dijadwalkan untuk akun ini" right={<Button size="sm" variant="ghost" icon={<Icons.calendar size={15} />} onClick={() => app.go("calendar")}>Lihat di kalender</Button>}>Postingan kamu</SectionTitle>
        {myPosts.length === 0 ? (
          <div style={{ fontFamily: FCo, fontSize: 12.5, color: "var(--ink-400)", padding: "8px 2px" }}>Belum ada draf atau postingan terjadwal untuk akun ini. Yang kamu buat di atas akan muncul di sini.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {myPosts.map((o) => (
              <button key={o.id} onClick={() => app.go("composer", { ch: o.ch, postId: o.id })}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", border: "1px solid var(--line)", borderRadius: 13, cursor: "pointer", background: "#fff", textAlign: "left", width: "100%" }}>
                <BrandAvatar brand={b} src={channel.avatarUrl} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: FCo, fontWeight: 600, fontSize: 13, color: "var(--ink-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.title}</span>
                    <span style={{ fontFamily: FCo, fontSize: 9.5, fontWeight: 600, color: b.accent, background: b.soft, padding: "1px 7px", borderRadius: 999, flex: "0 0 auto" }}>{o.type} · sekali</span>
                  </div>
                  <div style={{ fontFamily: FCo, fontSize: 11.5, color: "var(--ink-400)", marginTop: 2 }}>{pad(o.day)}/{o.ym.slice(5)} · {o.time} WIB</div>
                </div>
                <Status s={o.status} />
                <Icons.chevRight size={16} style={{ color: "var(--ink-300)", flex: "0 0 auto" }} />
              </button>
            ))}
          </div>
        )}
      </Panel>

      <Lightbox imgs={media} index={view} onClose={() => setView(null)} onIndex={setView}
        ratio={isFeed ? null : 16 / 9}
        onReplace={(idx) => { setView(null); startReplace(idx); }}
        onDelete={(idx) => { const remaining = media.length - 1; setMedia(ms => ms.filter((_, x) => x !== idx)); setView(remaining <= 0 ? null : Math.min(idx, remaining - 1)); }} />
    </div>
  );
}

const TT_PRIVACY_LABEL = { SELF_ONLY: "Hanya saya (privat)", MUTUAL_FOLLOW_FRIENDS: "Teman", FOLLOWER_OF_CREATOR: "Pengikut", PUBLIC_TO_EVERYONE: "Publik" };

function Check({ label, hint, checked, onChange, disabled }) {
  return (
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 2px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}>
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 1, width: 16, height: 16, accentColor: "#111", flex: "0 0 auto" }} />
      <span style={{ minWidth: 0 }}>
        <span style={{ fontFamily: FCo, fontSize: 13, color: "var(--ink-800)" }}>{label}</span>
        {hint && <span style={{ display: "block", fontFamily: FCo, fontSize: 11.5, color: "var(--ink-400)", marginTop: 2, lineHeight: 1.4 }}>{hint}</span>}
      </span>
    </label>
  );
}

// TikTok Direct Post compliance panel. Mirrors the disclosure/privacy/music
// elements TikTok's audit requires on a posting screen.
function TikTokOptions({ tk, setTkField, info, audited, valid }) {
  const loading = !info || info.ok === false;
  const privOptions = (audited && info?.privacyOptions?.length)
    ? info.privacyOptions.map((p) => ({ value: p, label: TT_PRIVACY_LABEL[p] || p }))
    : [{ value: "SELF_ONLY", label: TT_PRIVACY_LABEL.SELF_ONLY }];
  const note = { fontFamily: FCo, fontSize: 11.5, color: "var(--ink-500)", lineHeight: 1.45, marginTop: 6 };
  const subLabel = { fontFamily: FCo, fontSize: 11.5, fontWeight: 600, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: 0.3, marginTop: 4 };
  return (
    <Panel>
      <SectionTitle sub="Wajib sesuai pedoman TikTok">Pengaturan TikTok</SectionTitle>
      {info?.username && <div style={{ fontFamily: FCo, fontSize: 12, color: "var(--ink-600)", marginBottom: 10 }}>Posting sebagai <b style={{ color: "var(--ink-900)" }}>@{info.username}</b></div>}

      <Field label="Siapa yang bisa lihat">
        <Select value={audited ? tk.privacy : "SELF_ONLY"} onChange={(v) => setTkField("privacy", v)} options={privOptions} />
      </Field>
      {!audited && <div style={note}>Akun belum lolos audit TikTok — semua video terbit <b>privat (Hanya saya)</b> dan akun TikTok harus disetel <b>Private</b>. Opsi Publik/Teman terbuka setelah audit.</div>}

      <div style={subLabel}>Izinkan interaksi</div>
      <Check label="Komentar" checked={tk.allowComment && !info?.commentDisabled} disabled={loading || info?.commentDisabled} onChange={(v) => setTkField("allowComment", v)} hint={info?.commentDisabled ? "Dimatikan di setelan akun TikTok" : undefined} />
      <Check label="Duet" checked={tk.allowDuet && !info?.duetDisabled} disabled={loading || info?.duetDisabled} onChange={(v) => setTkField("allowDuet", v)} hint={info?.duetDisabled ? "Dimatikan di setelan akun TikTok" : undefined} />
      <Check label="Stitch" checked={tk.allowStitch && !info?.stitchDisabled} disabled={loading || info?.stitchDisabled} onChange={(v) => setTkField("allowStitch", v)} hint={info?.stitchDisabled ? "Dimatikan di setelan akun TikTok" : undefined} />

      <div style={{ borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 6 }}>
        <Check label="Konten ini mempromosikan barang atau jasa" checked={tk.commercial} onChange={(v) => { setTkField("commercial", v); if (!v) { setTkField("yourBrand", false); setTkField("branded", false); } }} />
        {tk.commercial && <div style={{ paddingLeft: 26 }}>
          <Check label="Konten merek saya sendiri" hint="Mempromosikan bisnis/merek Anda sendiri." checked={tk.yourBrand} onChange={(v) => setTkField("yourBrand", v)} />
          <Check label="Konten bermerek (kerja sama berbayar)" hint={audited ? "Tidak bisa privat — butuh privasi Publik." : "Butuh akun lolos audit + privasi Publik."} checked={tk.branded} disabled={!audited} onChange={(v) => setTkField("branded", v)} />
          {(tk.yourBrand || tk.branded) && <div style={{ ...note, color: "var(--ink-700)" }}>{tk.branded ? "Postingan akan diberi label “Kemitraan berbayar”." : "Postingan akan diberi label “Konten promosi”."}</div>}
        </div>}
      </div>

      <div style={{ borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 6 }}>
        <Check label="Saya setuju pada Konfirmasi Penggunaan Musik TikTok" hint="Dengan memposting, Anda setuju pada Music Usage Confirmation TikTok." checked={tk.musicOk} onChange={(v) => setTkField("musicOk", v)} />
      </div>

      {!valid && <div style={{ ...note, color: "var(--danger)" }}>Lengkapi dulu: setujui penggunaan musik{tk.commercial && !(tk.yourBrand || tk.branded) ? " & pilih jenis konten komersial" : ""}{tk.branded && tk.privacy === "SELF_ONLY" ? " (konten bermerek tidak bisa privat)" : ""}.</div>}
    </Panel>
  );
}
