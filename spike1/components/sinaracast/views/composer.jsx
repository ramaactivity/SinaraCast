"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Topbar } from "../shell";
import { uploadPoolImage, uploadReelVideo, createScheduledPost, loadScheduledPost, updateScheduledPost, deleteScheduledPost, loadContentPlan, linkPlanToOneoff, updateChannelPersona } from "../dataLayer";
import { BRANDS, BrandAvatar, Panel, Button, Field, Textarea, TimeField, DateField, Checkbox, MediaThumb, SectionTitle, Spinner, Select, Status } from "../ui";
import { Lightbox } from "../lightbox";
const { useState: uCo, useRef, useEffect } = React;
const FCo = "var(--font)";
const MAX_VIDEO_MB = 300; // IG video; >48 MB detours to R2 (Supabase free caps at 50)
const TIKTOK_MAX_MB = 50;  // TikTok pulls from URL — unverified domains are gated, keep on Supabase
// True if the file is a video we can publish. Some browsers (and iOS picking a
// .MOV from Files) report an empty file.type, so fall back to the extension.
const isVideoFile = (f) => ["video/mp4", "video/quicktime"].includes(f?.type) || /\.(mov|mp4|m4v)$/i.test(f?.name || "");

function readVideoMeta(file) {
  return new Promise((res) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    let done = false;
    // Never let a stubborn .MOV hang the whole upload silently: whatever happens
    // (metadata, decode error, or nothing at all within 12s) we resolve and let
    // the upload proceed — Instagram re-encodes server-side anyway. Zero dims just
    // skip the 9:16 hint. The only hard failure left is the actual upload call.
    const finish = (meta) => { if (done) return; done = true; clearTimeout(t); URL.revokeObjectURL(url); res(meta); };
    const t = setTimeout(() => finish({ width: 0, height: 0, duration: 0, unread: true }), 12000);
    v.preload = "metadata";
    v.onloadedmetadata = () => finish({ width: v.videoWidth, height: v.videoHeight, duration: v.duration });
    v.onerror = () => finish({ width: 0, height: 0, duration: 0, unread: true });
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
const tomorrowWib = () => { const d = new Date(Date.now() + 31 * 3600 * 1000); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
const isoToWibParts = (iso) => { const d = new Date(new Date(iso).getTime() + 7 * 3600 * 1000); return { date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` }; };
// content_plan.format → composer post type (Instagram one-off).
const PLAN_FORMAT_TYPE = { story: "story", reels: "reels", video: "reels", feed: "feed", carousel: "feed", single_image: "feed", thread: "feed" };

// Numbered step badge in panel titles — the page reads as a flow, not a pile of panels.
function Step({ n, accent, soft }) {
  return <span style={{ width: 22, height: 22, borderRadius: 8, background: soft, color: accent, display: "inline-grid", placeItems: "center", fontFamily: FCo, fontSize: 11.5, fontWeight: 700, flex: "0 0 auto" }}>{n}</span>;
}
const StepTitle = ({ n, accent, soft, children }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}><Step n={n} accent={accent} soft={soft} />{children}</span>
);

// Post-type picker: one card per type with its format spec attached, replacing the
// old plain segmented + repeated info banners.
function TypeCards({ options, value, onChange, accent, soft }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: 10 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)}
            style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, padding: "12px 14px", borderRadius: 13, cursor: "pointer", textAlign: "left", minWidth: 0,
              border: on ? `1.5px solid ${accent}` : "1px solid var(--line)", background: on ? soft : "var(--surface)",
              boxShadow: on ? "var(--shadow-sm)" : "none", transition: "border-color .15s, background .15s, box-shadow .15s" }}>
            <span style={{ color: on ? accent : "var(--ink-400)", display: "inline-flex" }}>{o.icon}</span>
            <span style={{ fontFamily: FCo, fontWeight: 600, fontSize: 13.5, color: on ? "var(--ink-900)" : "var(--ink-700)" }}>{o.label}</span>
            <span style={{ fontFamily: FCo, fontSize: 10.5, color: "var(--ink-400)", lineHeight: 1.35 }}>{o.spec}</span>
          </button>
        );
      })}
    </div>
  );
}

// One-tap presets for schedule date/time — the most repeated action on this page.
function QuickChip({ on, children, onClick }) {
  return (
    <button onClick={onClick} style={{ border: on ? "1px solid var(--primary-300)" : "1px solid var(--line)", background: on ? "var(--primary-100)" : "var(--surface)",
      color: on ? "#E0922A" : "var(--ink-500)", fontFamily: FCo, fontSize: 11.5, fontWeight: 600, padding: "5px 11px", borderRadius: 999, cursor: "pointer", transition: "all .14s" }}>{children}</button>
  );
}

export function ComposerView() {
  const app = useApp();
  const postId = app.params.postId || null; // present → edit mode
  const planId = app.params.planId || null; // present → creating a one-off FOR a content_plan (hybrid link)
  const [chId, setChId] = uCo(app.params.ch || app.channel);
  // resolve within the active brand's accounts (avoid falling back to another brand's channel)
  const accts = app.brandAccounts || [];
  const channel = accts.find(c => c.id === chId) || accts.find(c => c.id === app.channel) || accts[0];
  const b = brandFor(channel?.id, app.channels);
  const isTikTok = channel?.platform === "tiktok";

  const [type, setType] = uCo(channel?.platform === "tiktok" ? "tiktok_video" : "story");
  const [media, setMedia] = uCo([]); // [{ storage_path, url, width, height, format, bytes, aspect_ok, assetId? }]
  const [caption, setCaption] = uCo("");
  const [firstComment, setFirstComment] = uCo("");
  // params.date (e.g. from the Hari Spesial page) pre-fills the schedule date.
  const [date, setDate] = uCo(app.params.date || todayWib());
  const [time, setTime] = uCo("09:00");
  const [uploading, setUploading] = uCo(false);
  const [saving, setSaving] = uCo(false);
  const [loading, setLoading] = uCo(!!postId || !!planId);
  const [origStatus, setOrigStatus] = uCo(null); // existing status when editing
  // TikTok-only Direct Post compliance options (TikTok UX guidelines).
  const [tk, setTk] = uCo({ privacy: "SELF_ONLY", allowComment: true, allowDuet: true, allowStitch: true, commercial: false, yourBrand: false, branded: false, musicOk: false });
  const [tkInfo, setTkInfo] = uCo(null); // creator_info: { audited, privacyOptions, commentDisabled, duetDisabled, stitchDisabled, username }
  const setTkField = (k, v) => setTk((s) => ({ ...s, [k]: v }));
  const [view, setView] = uCo(null); // lightbox index, or null
  const [dragOver, setDragOver] = uCo(false);
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

  // Prefill from a content_plan when "Jadwalkan otomatis via SinaraCast" sent us here
  // (new one-off for an Instagram plan entry). On schedule, save() links them.
  useEffect(() => {
    if (!planId || postId) return;
    let active = true;
    loadContentPlan(planId).then((p) => {
      if (!active || !p) { if (active) setLoading(false); return; }
      const slug = app.channels.find((c) => c._id === p.channel_id)?.id;
      if (slug) setChId(slug);
      setType(PLAN_FORMAT_TYPE[p.format] || "story");
      if (p.caption) setCaption(p.caption);
      if (p.planned_date) setDate(p.planned_date);
      if (p.planned_time) setTime((p.planned_time || "").slice(0, 5));
      setLoading(false);
    }).catch(() => active && setLoading(false));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  // Follow the sidebar's active account when composing a new post. Only on an actual
  // switch (not initial mount, so opening for a specific account via params.ch is kept,
  // and not in edit/plan flows). Resets media since post type/rules differ per platform.
  const lastCh = useRef(app.channel);
  useEffect(() => {
    if (postId || planId) return;
    if (app.channel && app.channel !== lastCh.current) { lastCh.current = app.channel; setChId(app.channel); setMedia([]); }
  }, [app.channel, postId, planId]);

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

  const onFiles = (e) => {
    // Snapshot the files into a real array BEFORE clearing the input — clearing
    // value can empty the live FileList in some browsers, dropping the selection.
    const files = [...(e.target.files || [])];
    e.target.value = "";
    ingestFiles(files);
  };
  async function ingestFiles(fileList) {
    const files = [...(fileList || [])];
    let rep = replaceIdxRef.current; replaceIdxRef.current = null; // replace this slot (Feed); single types replace inherently
    for (const file of files) {
      if (isVideoType) {
        if (!isVideoFile(file)) { app.toast("Video harus MP4/MOV", "error"); continue; }
        const maxMB = isTikVid ? TIKTOK_MAX_MB : MAX_VIDEO_MB;
        if (file.size > maxMB * 1024 * 1024) { app.toast(`Video maksimal ${maxMB} MB`, "error"); continue; }
        const meta = await readVideoMeta(file);
        if (meta.unread) app.toast("Video diunggah, tapi pratinjau mungkin tak tampil di perangkat ini", "info");
        const vr = meta.width / meta.height;
        if (!meta.unread && Math.abs(vr - 9 / 16) > 0.06) app.toast(isTikVid ? "Video bukan 9:16 — TikTok mungkin menyesuaikan" : "Video bukan 9:16 — Instagram akan menyesuaikan (tambah bilah hitam)", "info");
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
      if (type === "story" && isVideoFile(file)) {
        if (file.size > MAX_VIDEO_MB * 1024 * 1024) { app.toast(`Video maksimal ${MAX_VIDEO_MB} MB`, "error"); continue; }
        const meta = await readVideoMeta(file);
        if (meta.unread) app.toast("Video diunggah, tapi pratinjau mungkin tak tampil di perangkat ini", "info");
        else if (Math.abs(meta.width / meta.height - 9 / 16) > 0.06) app.toast("Video bukan 9:16 — Instagram akan menyesuaikan", "info");
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
      let newPostId = postId;
      if (postId) await updateScheduledPost(postId, payload);
      else newPostId = await createScheduledPost(payload);
      // Hybrid link (FR-46): when this one-off was created FOR a content_plan and it's
      // actually scheduled to publish, connect them so the plan auto-fills on publish.
      const linked = planId && !postId && status === "scheduled";
      if (linked) await linkPlanToOneoff(planId, newPostId);
      await app.reload();
      app.toast(linked ? "Konten terhubung & dijadwalkan otomatis ✓" : postId ? "Perubahan disimpan" : (status === "scheduled" ? `Postingan dijadwalkan ${date} ${time} WIB` : "Disimpan sebagai draf"), "success");
      app.go(linked ? "contentEditor" : "calendar", linked ? { id: planId } : {});
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

      {planId && !postId && <div style={{ display: "flex", gap: 9, marginBottom: 16, background: "var(--st-publishing-bg)", borderRadius: 12, padding: "11px 14px" }}>
        <Icons.sparkle size={16} style={{ color: "var(--st-publishing)", flex: "0 0 auto", marginTop: 1 }} />
        <span style={{ fontFamily: FCo, fontSize: 12.5, color: "var(--ink-600)", lineHeight: 1.45 }}>Membuat postingan untuk konten yang kamu rencanakan. Setelah <b>Jadwalkan</b>, konten itu terhubung otomatis — status & link terisi sendiri saat terbit.</span>
      </div>}

      <div style={{ display: "grid", gridTemplateColumns: app.isMobile ? "1fr" : "minmax(0,1fr) 320px", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel>
            <SectionTitle sub="Pilih akun tujuan dan jenis postingan"><StepTitle n={1} accent={b.accent} soft={b.soft}>Akun & jenis</StepTitle></SectionTitle>
            {!postId && (app.brandAccounts || []).length > 1 && (
              <Field label="Posting ke akun" style={{ marginBottom: 14 }}>
                <Select value={channel.id} onChange={(v) => { setChId(v); app.setChannel(v); setMedia([]); }}
                  options={(app.brandAccounts || []).map(c => ({ value: c.id, label: `${c.name} · ${c.handle}` }))} />
              </Field>
            )}
            {isTikTok
              ? <TypeCards accent={b.accent} soft={b.soft} value="tiktok_video" onChange={() => {}} options={[
                  { value: "tiktok_video", label: "Video TikTok", spec: `Video 9:16 · MP4/MOV · maks ${TIKTOK_MAX_MB} MB`, icon: <Icons.film size={18} /> },
                ]} />
              : <TypeCards accent={b.accent} soft={b.soft} value={type} onChange={(v) => { setType(v); setMedia([]); }} options={[
                  { value: "story", label: "Story", spec: "Gambar atau video 9:16", icon: <Icons.image size={18} /> },
                  { value: "feed", label: "Feed", spec: "1–10 gambar · 4:5 s.d. 1.91:1", icon: <Icons.grid size={18} /> },
                  { value: "reels", label: "Reels", spec: "Video 9:16 · maks 15 menit", icon: <Icons.film size={18} /> },
                ]} />}
            {isTikVid && !audited && <div style={{ display: "flex", gap: 8, marginTop: 12, fontFamily: FCo, fontSize: 11.5, color: "var(--ink-500)", lineHeight: 1.5 }}>
              <Icons.info size={14} style={{ color: "var(--st-publishing)", flex: "0 0 auto", marginTop: 1 }} />
              <span>Akun belum lolos audit TikTok: video terbit privat (Hanya saya) dan akun harus disetel Private.</span>
            </div>}
          </Panel>
          {isTikVid && <TikTokOptions tk={tk} setTkField={setTkField} info={tkInfo} audited={audited} valid={tkValid} />}
          <Panel>
            <SectionTitle sub={isVideoType ? "Satu video tegak 9:16" : isFeed ? "Sampai 10 gambar (carousel)" : "Satu gambar atau video tegak 9:16"} right={<Button size="sm" variant="secondary" icon={uploading ? <Spinner size={15} /> : <Icons.upload size={15} />} disabled={uploading} onClick={() => fileRef.current?.click()}>{(media.length >= 1 && (isVideoType || type === "story")) ? "Ganti" : "Unggah"}</Button>}><StepTitle n={2} accent={b.accent} soft={b.soft}>{isVideoType ? "Video" : isFeed ? "Gambar" : "Media"}</StepTitle></SectionTitle>
            <input ref={fileRef} type="file" accept={isVideoType ? "video/mp4,video/quicktime" : isFeed ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,video/mp4,video/quicktime"} multiple={isFeed} onChange={onFiles} style={{ display: "none" }} />
            {media.length === 0 ? (
              <div onClick={() => !uploading && fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); ingestFiles(e.dataTransfer.files); }}
                style={{ border: `1.5px dashed ${dragOver ? "var(--primary-400)" : "var(--line)"}`, background: dragOver ? "var(--primary-100)" : "rgba(140,144,158,.045)", borderRadius: 14, padding: "26px 20px", textAlign: "center", cursor: uploading ? "default" : "pointer", transition: "background .15s, border-color .15s" }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, margin: "0 auto 10px", display: "grid", placeItems: "center", background: "var(--primary-100)", color: "var(--primary-500)" }}>{uploading ? <Spinner size={20} /> : <Icons.upload size={20} />}</div>
                <div style={{ fontFamily: FCo, fontWeight: 600, fontSize: 13.5, color: "var(--ink-800)" }}>{uploading ? "Mengunggah…" : "Tarik & lepas, atau klik untuk unggah"}</div>
                <div style={{ fontFamily: FCo, fontSize: 11.5, color: "var(--ink-400)", marginTop: 4 }}>{isVideoType ? `Video tegak 9:16 · MP4/MOV · maks ${isTikVid ? TIKTOK_MAX_MB : MAX_VIDEO_MB} MB` : isFeed ? "Gambar JPG / PNG · sampai 10 (carousel)" : "Gambar atau video tegak 9:16"}</div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {media.map((m, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    {isVid(m)
                      ? <div onClick={() => setView(i)} title="Klik untuk pratinjau" style={{ position: "relative", cursor: "zoom-in", lineHeight: 0 }}>
                          <video src={m.url} muted playsInline preload="metadata" style={{ width: 120, aspectRatio: "9/16", objectFit: "cover", borderRadius: 12, border: "1px solid var(--line)", background: "#000", display: "block" }} />
                          <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,.6)", pointerEvents: "none" }}><Icons.play size={26} /></span>
                        </div>
                      : <MediaThumb seed={i} src={m.url} w={isFeed ? 96 : 90} ratio={isFeed ? 1 : 16 / 9} label={isFeed ? "Feed" : "9:16"} onClick={() => setView(i)} />}
                    <button onClick={() => setMedia(ms => ms.filter((_, x) => x !== i))} aria-label="Hapus" style={{ position: "absolute", top: -7, right: -7, width: 22, height: 22, borderRadius: "50%", border: "none", cursor: "pointer", background: "var(--surface)", color: "var(--danger)", boxShadow: "var(--shadow-sm)", display: "grid", placeItems: "center" }}><Icons.x size={13} sw={2.4} /></button>
                  </div>
                ))}
                {isFeed && media.length < 10 && (
                  <button onClick={() => fileRef.current?.click()} title="Tambah gambar" style={{ width: 96, height: 96, borderRadius: 12, border: "1.5px dashed var(--line)", background: "rgba(140,144,158,.045)", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--ink-400)" }}><Icons.plus size={22} /></button>
                )}
              </div>
            )}
          </Panel>

          {hasCaption && (
            <Panel>
              <SectionTitle sub={`${caption.length} / ${capLimit} karakter${(isReels || isTikVid) ? " · opsional" : ""}`}><StepTitle n={3} accent={b.accent} soft={b.soft}>Tulisan (caption)</StepTitle></SectionTitle>
              <Textarea placeholder={isTikVid ? "Tulis caption TikTok (opsional)…" : isReels ? "Tulis caption Reels (opsional)…" : "Tulis caption postingan…"} value={caption} invalid={overCap} onChange={e => setCaption(e.target.value)} style={{ minHeight: 120 }} />
              {overCap && <div style={{ fontFamily: FCo, fontSize: 11.5, color: "var(--danger)", marginTop: 6 }}>Kepanjangan, maksimal {capLimit} karakter.</div>}
              <CaptionAI
                key={channel._id}
                accent={b.accent} soft={b.soft}
                caption={caption} onApply={setCaption}
                token={app.session?.access_token}
                toast={app.toast}
                channelDbId={channel._id}
                persona={channel.aiPersona || null}
                onReload={app.reload}
                context={{ imageUrl: media.find(x => !isVid(x))?.url || null, platform: isTikTok ? "tiktok" : "instagram", postType: type, brandName: b.name }}
              />
              {!isTikVid && <Field label="Komentar pertama (untuk hashtag)" hint="Diposting otomatis di kolom komentar setelah postingan terbit." style={{ marginTop: 16 }}>
                <Textarea value={firstComment} onChange={e => setFirstComment(e.target.value)} style={{ minHeight: 64 }} placeholder="#hashtag …" />
              </Field>}
            </Panel>
          )}
        </div>

        {/* schedule + preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: app.isMobile ? "static" : "sticky", top: 92 }}>
          <Panel strong>
            <SectionTitle sub="Waktu WIB"><StepTitle n={hasCaption ? 4 : 3} accent={b.accent} soft={b.soft}>Kapan terbit</StepTitle></SectionTitle>
            <Field label="Tanggal"><DateField value={date} min={todayWib()} onChange={setDate} /></Field>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <QuickChip on={date === todayWib()} onClick={() => setDate(todayWib())}>Hari ini</QuickChip>
              <QuickChip on={date === tomorrowWib()} onClick={() => setDate(tomorrowWib())}>Besok</QuickChip>
            </div>
            <Field label="Jam" style={{ marginTop: 14 }}><TimeField value={time} onChange={setTime} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 8 }}>
              {["07:00", "09:00", "12:00", "17:00", "19:30", "21:00"].map((t) => (
                <QuickChip key={t} on={time === t} onClick={() => setTime(t)}>{t.replace(":", ".")}</QuickChip>
              ))}
            </div>
            <div style={{ display: "flex", gap: 9, marginTop: 14, background: "var(--green-100)", borderRadius: 11, padding: "10px 12px" }}>
              <Icons.info size={15} style={{ color: "var(--green-500)", flex: "0 0 auto", marginTop: 1 }} />
              <span style={{ fontFamily: FCo, fontSize: 11.5, color: "var(--ink-600)", lineHeight: 1.45 }}>Terbit otomatis sekali di waktu yang kamu pilih. Dijamin tidak terbit dua kali.</span>
            </div>
          </Panel>
          <Panel>
            <SectionTitle sub={`Perkiraan tampilan di ${isTikTok ? "TikTok" : "Instagram"}`}>Pratinjau</SectionTitle>
            <PhonePreview type={type} media={media} channel={channel} b={b} caption={caption} onView={() => media.length && setView(0)} onUpload={() => fileRef.current?.click()} />
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
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.borderColor = "var(--primary-200)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--line)"; }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", border: "1px solid var(--line)", borderRadius: 13, cursor: "pointer", background: "var(--surface)", textAlign: "left", width: "100%", transition: "box-shadow .14s, border-color .14s" }}>
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

// Phone-frame preview that mimics how the post will actually look: Story gets the
// progress bars + handle overlay, Reels/TikTok the bottom caption overlay, Feed the
// in-feed card with header and caption line. Empty state invites the upload.
function PhonePreview({ type, media, channel, b, caption, onView, onUpload }) {
  const m = media[0];
  const isFeed = type === "feed";
  const handle = (channel.handle || "").replace(/^@/, "");
  const vid = isVid(m);
  const mediaEl = m
    ? (vid
      ? <video src={m.url} muted playsInline preload="metadata" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      : <img src={m.url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />)
    : null;

  if (isFeed) {
    return (
      <div onClick={m ? onView : onUpload} title={m ? "Klik untuk pratinjau besar" : "Unggah gambar"} style={{ width: 216, margin: "0 auto", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden", background: "var(--surface)", boxShadow: "var(--shadow-sm)", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 10px" }}>
          <BrandAvatar brand={b} src={channel.avatarUrl} size={22} />
          <span style={{ fontFamily: FCo, fontWeight: 600, fontSize: 11, color: "var(--ink-900)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{handle}</span>
          <Icons.more size={14} style={{ color: "var(--ink-400)" }} />
        </div>
        <div style={{ position: "relative", aspectRatio: "1", background: "linear-gradient(150deg, rgba(140,144,158,.10), rgba(140,144,158,.18))" }}>
          {mediaEl || <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--ink-300)" }}><div style={{ textAlign: "center" }}><Icons.image size={26} /><div style={{ fontFamily: FCo, fontSize: 10.5, marginTop: 6 }}>Unggah gambar dulu</div></div></div>}
          {media.length > 1 && <span style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,.55)", color: "#fff", fontFamily: FCo, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999 }}>1/{media.length}</span>}
        </div>
        {media.length > 1 && <div style={{ display: "flex", gap: 3, justifyContent: "center", padding: "7px 0 0" }}>
          {media.slice(0, 10).map((_, i) => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: i === 0 ? b.accent : "var(--line)" }} />)}
        </div>}
        <div style={{ padding: "8px 10px 11px", fontFamily: FCo, fontSize: 10.5, color: "var(--ink-600)", lineHeight: 1.45, maxHeight: 46, overflow: "hidden" }}>
          <b style={{ color: "var(--ink-900)" }}>{handle}</b> {caption ? caption.slice(0, 90) : <span style={{ color: "var(--ink-300)" }}>caption kamu…</span>}
        </div>
      </div>
    );
  }

  // Story / Reels / TikTok — vertical 9:16 frame
  const story = type === "story";
  return (
    <div onClick={m ? onView : onUpload} title={m ? "Klik untuk pratinjau besar" : "Unggah media"}
      style={{ width: 184, aspectRatio: "9/16", margin: "0 auto", position: "relative", borderRadius: 20, overflow: "hidden", border: "1px solid var(--line)", background: "linear-gradient(160deg, #2c2d34, #43444e)", boxShadow: "var(--shadow-sm)", cursor: "pointer" }}>
      {mediaEl}
      {!m && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "rgba(255,255,255,.55)" }}>
        <div style={{ textAlign: "center" }}>{type === "reels" || type === "tiktok_video" ? <Icons.film size={26} /> : <Icons.image size={26} />}<div style={{ fontFamily: FCo, fontSize: 10.5, marginTop: 6 }}>Unggah media dulu</div></div>
      </div>}
      {vid && m && <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,.6)", pointerEvents: "none" }}><Icons.play size={28} /></span>}
      {story ? (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "8px 10px 18px", background: "linear-gradient(rgba(0,0,0,.42), transparent)", pointerEvents: "none" }}>
          <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
            {[1, 2, 3].map((i) => <span key={i} style={{ flex: 1, height: 2, borderRadius: 2, background: i === 1 ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.35)" }} />)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <BrandAvatar brand={b} src={channel.avatarUrl} size={20} />
            <span style={{ fontFamily: FCo, fontWeight: 600, fontSize: 10.5, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,.4)" }}>{handle}</span>
            <span style={{ fontFamily: FCo, fontSize: 9.5, color: "rgba(255,255,255,.75)" }}>baru saja</span>
          </div>
        </div>
      ) : (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "26px 10px 12px", background: "linear-gradient(transparent, rgba(0,0,0,.55))", pointerEvents: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <BrandAvatar brand={b} src={channel.avatarUrl} size={18} />
            <span style={{ fontFamily: FCo, fontWeight: 600, fontSize: 10.5, color: "#fff" }}>{handle}</span>
          </div>
          {caption && <div style={{ fontFamily: FCo, fontSize: 9.5, color: "rgba(255,255,255,.92)", lineHeight: 1.4, maxHeight: 27, overflow: "hidden" }}>{caption.slice(0, 70)}</div>}
        </div>
      )}
    </div>
  );
}

// Bantuan caption AI. Tiga cara pakai: buat dari gambar, buat dari arahan/kata kunci,
// atau poles caption yang sudah ditulis. Hasil tampil sebagai saran — draf pengguna
// tidak ditimpa sampai mereka menekan "Pakai". Karakter (persona) akun disimpan per
// akun, jadi AI mengikuti gaya akun itu tanpa perlu di-brief ulang tiap kali.
const TONE_OPTS = [
  { value: "santai", label: "Santai" },
  { value: "profesional", label: "Profesional" },
  { value: "ceria", label: "Ceria" },
  { value: "jualan", label: "Jualan" },
];
const EMOJI_OPTS = [
  { value: "tanpa", label: "Tanpa emoji" },
  { value: "sedikit", label: "Sedikit" },
  { value: "banyak", label: "Banyak" },
];
// Titik awal cepat — mengisi kolom "karakter" agar tak mulai dari nol.
const PERSONA_PRESETS = [
  { label: "Hangat & santai", voice: "Hangat, akrab, dan santai seperti ngobrol dengan teman dekat." },
  { label: "Formal & berkelas", voice: "Formal, elegan, dan berkelas. Pilihan kata rapi, sopan, dan meyakinkan." },
  { label: "Seperti teman", voice: "Seperti teman sebaya yang asik dan ringan, bahasa sehari-hari yang relate." },
  { label: "Semangat & ceria", voice: "Ceria, energik, dan penuh semangat. Kalimat pendek yang memacu." },
];
const emptyPersona = () => ({ voice: "", audience: "", emoji: "sedikit", signature: "", hashtags: "", avoid: "" });
const personaSummary = (p) => (p?.voice?.trim() ? p.voice.trim().split(/[.,]/)[0].slice(0, 48) : "belum diatur");

function CaptionAI({ accent, soft, caption, onApply, token, toast, channelDbId, persona, onReload, context }) {
  const [open, setOpen] = uCo(false);
  const [tone, setTone] = uCo("santai");
  const [instruction, setInstruction] = uCo("");
  const [busy, setBusy] = uCo(false);
  const [result, setResult] = uCo("");
  // Editor karakter akun
  const [editOpen, setEditOpen] = uCo(false);
  const [draft, setDraft] = uCo(persona || emptyPersona());
  const [savingP, setSavingP] = uCo(false);
  const setP = (k, v) => setDraft((s) => ({ ...s, [k]: v }));
  const hasPersona = !!persona?.voice?.trim();

  async function run(mode) {
    if (busy) return;
    if (mode === "polish" && !caption.trim()) { toast("Tulis dulu captionmu untuk diperbaiki", "info"); return; }
    setBusy(true); setResult("");
    try {
      const r = await fetch("/api/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        // tone hanya dikirim kalau belum ada persona (persona jadi gaya utama).
        body: JSON.stringify({ mode, draft: caption, instruction, tone: hasPersona ? undefined : tone, persona: persona || null, ...context }),
      });
      const j = await r.json();
      if (!j.ok) { toast(j.error || "Gagal membuat caption", "error"); return; }
      setResult(j.caption);
    } catch (e) {
      toast("Gagal membuat caption: " + (e.message || e), "error");
    } finally { setBusy(false); }
  }

  async function savePersona() {
    if (savingP) return;
    setSavingP(true);
    try {
      const clean = draft.voice?.trim() || draft.audience?.trim() || draft.signature?.trim() || draft.hashtags?.trim() || draft.avoid?.trim() ? draft : null;
      await updateChannelPersona(channelDbId, clean);
      await onReload?.();
      toast(clean ? "Karakter akun disimpan ✓" : "Karakter akun dikosongkan", "success");
      setEditOpen(false);
    } catch (e) {
      toast("Gagal menyimpan karakter: " + (e.message || e), "error");
    } finally { setSavingP(false); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 12, padding: "8px 13px", borderRadius: 11, cursor: "pointer",
        border: `1px solid ${accent}`, background: soft, color: accent, fontFamily: FCo, fontSize: 12.5, fontWeight: 600 }}>
        <Icons.sparkle size={15} /> Bantuan AI — buat atau perbaiki caption
      </button>
    );
  }

  return (
    <div style={{ marginTop: 12, border: "1px solid var(--line)", borderRadius: 14, padding: 14, background: "rgba(140,144,158,.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ display: "inline-flex", color: accent }}><Icons.sparkle size={16} /></span>
        <span style={{ fontFamily: FCo, fontWeight: 600, fontSize: 13, color: "var(--ink-900)", flex: 1 }}>Bantuan AI</span>
        <button onClick={() => setOpen(false)} aria-label="Tutup" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-400)", display: "inline-flex" }}><Icons.x size={15} /></button>
      </div>

      {/* Ringkasan karakter akun + tombol atur/ubah */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "8px 11px", borderRadius: 10, background: hasPersona ? soft : "rgba(140,144,158,.06)", border: `1px solid ${hasPersona ? accent : "var(--line)"}` }}>
        <Icons.user size={14} style={{ color: hasPersona ? accent : "var(--ink-400)", flex: "0 0 auto" }} />
        <span style={{ fontFamily: FCo, fontSize: 11.5, color: "var(--ink-600)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          Karakter akun: <b style={{ color: hasPersona ? "var(--ink-900)" : "var(--ink-500)" }}>{personaSummary(persona)}</b>
        </span>
        <button onClick={() => { setDraft(persona || emptyPersona()); setEditOpen((v) => !v); }} style={{ border: "none", background: "none", cursor: "pointer", color: accent, fontFamily: FCo, fontSize: 11.5, fontWeight: 600, flex: "0 0 auto" }}>
          {hasPersona ? "Ubah" : "Atur"}
        </button>
      </div>

      {editOpen && (
        <div style={{ marginBottom: 12, border: "1px solid var(--line)", borderRadius: 12, padding: 13, background: "var(--surface)" }}>
          <div style={{ fontFamily: FCo, fontSize: 12, color: "var(--ink-500)", lineHeight: 1.45, marginBottom: 10 }}>Setel sekali, dipakai terus untuk akun ini. Bisa diubah kapan saja.</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {PERSONA_PRESETS.map((p) => (
              <button key={p.label} onClick={() => setP("voice", p.voice)} style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink-600)", fontFamily: FCo, fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 999, cursor: "pointer" }}>{p.label}</button>
            ))}
          </div>
          <Field label="Karakter & gaya bahasa" hint="Inti kepribadian akun ini." style={{ marginBottom: 11 }}>
            <Textarea value={draft.voice} onChange={(e) => setP("voice", e.target.value)} placeholder="Mis. hangat & santai seperti teman, sesekali bercanda ringan…" style={{ minHeight: 58 }} />
          </Field>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Field label="Target pembaca" style={{ flex: "1 1 160px", minWidth: 150, marginBottom: 11 }}>
              <Textarea value={draft.audience} onChange={(e) => setP("audience", e.target.value)} placeholder="Mis. anak muda 18-25 di kota besar" style={{ minHeight: 40 }} />
            </Field>
            <Field label="Emoji" style={{ flex: "0 0 130px", minWidth: 120, marginBottom: 11 }}>
              <Select value={draft.emoji} onChange={(v) => setP("emoji", v)} options={EMOJI_OPTS} />
            </Field>
          </div>
          <Field label="Ajakan / penutup khas (opsional)" style={{ marginBottom: 11 }}>
            <Textarea value={draft.signature} onChange={(e) => setP("signature", e.target.value)} placeholder="Mis. Yuk mampir sekarang!" style={{ minHeight: 40 }} />
          </Field>
          <Field label="Tagar khas (opsional)" style={{ marginBottom: 11 }}>
            <Textarea value={draft.hashtags} onChange={(e) => setP("hashtags", e.target.value)} placeholder="#kopisusu #jakarta" style={{ minHeight: 40 }} />
          </Field>
          <Field label="Hindari (opsional)" hint="Kata/gaya yang tidak boleh dipakai." style={{ marginBottom: 12 }}>
            <Textarea value={draft.avoid} onChange={(e) => setP("avoid", e.target.value)} placeholder="Mis. bahasa alay, singkatan berlebihan" style={{ minHeight: 40 }} />
          </Field>
          <div style={{ display: "flex", gap: 9 }}>
            <Button size="sm" variant="primary" disabled={savingP} icon={savingP ? <Spinner size={14} color="#fff" /> : <Icons.check size={14} />} onClick={savePersona}>Simpan karakter</Button>
            <Button size="sm" variant="ghost" disabled={savingP} onClick={() => setEditOpen(false)}>Batal</Button>
          </div>
        </div>
      )}

      {/* Nada hanya relevan bila karakter belum diatur */}
      {!hasPersona && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <Field label="Gaya bahasa" style={{ flex: "1 1 140px", minWidth: 130, marginBottom: 0 }}>
            <Select value={tone} onChange={setTone} options={TONE_OPTS} />
          </Field>
        </div>
      )}
      <Field label="Arahan singkat (opsional)" hint={hasPersona ? "Konteks khusus kali ini. Karakter akun tetap dipakai otomatis." : "Mis. promo diskon 20% sampai Minggu, atau target ibu muda."} style={{ marginBottom: 12 }}>
        <Textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Kosongkan pun tidak apa-apa…" style={{ minHeight: 52 }} />
      </Field>

      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
        <Button size="sm" variant="primary" disabled={busy} icon={busy ? <Spinner size={14} color="#fff" /> : <Icons.sparkle size={15} />} onClick={() => run("generate")}>
          {context.imageUrl ? "Buatkan dari gambar" : "Buatkan caption"}
        </Button>
        <Button size="sm" variant="secondary" disabled={busy || !caption.trim()} icon={<Icons.edit size={14} />} onClick={() => run("polish")}>Perbaiki punyaku</Button>
      </div>

      {result && (
        <div style={{ marginTop: 12, border: `1px solid ${accent}`, borderRadius: 12, padding: 12, background: "var(--surface)" }}>
          <div style={{ fontFamily: FCo, fontSize: 10.5, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 7 }}>Saran AI</div>
          <div style={{ fontFamily: FCo, fontSize: 13, color: "var(--ink-800)", lineHeight: 1.5, whiteSpace: "pre-wrap", maxHeight: 260, overflow: "auto" }}>{result}</div>
          <div style={{ display: "flex", gap: 9, marginTop: 12, flexWrap: "wrap" }}>
            <Button size="sm" variant="primary" icon={<Icons.check size={14} />} onClick={() => { onApply(result); setResult(""); toast("Caption dipakai ✓", "success"); }}>Pakai ini</Button>
            <Button size="sm" variant="ghost" disabled={busy} icon={busy ? <Spinner size={13} /> : <Icons.retry size={14} />} onClick={() => run(caption.trim() && caption !== result ? "polish" : "generate")}>Buat lagi</Button>
          </div>
        </div>
      )}
    </div>
  );
}

const TT_PRIVACY_LABEL = { SELF_ONLY: "Hanya saya (privat)", MUTUAL_FOLLOW_FRIENDS: "Teman", FOLLOWER_OF_CREATOR: "Pengikut", PUBLIC_TO_EVERYONE: "Publik" };

function Check({ label, hint, checked, onChange, disabled }) {
  return (
    <div onClick={() => !disabled && onChange(!checked)} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 2px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}>
      <div style={{ marginTop: 1 }}><Checkbox checked={!!checked} disabled={disabled} onChange={onChange} size={18} /></div>
      <span style={{ minWidth: 0 }}>
        <span style={{ fontFamily: FCo, fontSize: 13, color: "var(--ink-800)" }}>{label}</span>
        {hint && <span style={{ display: "block", fontFamily: FCo, fontSize: 11.5, color: "var(--ink-400)", marginTop: 2, lineHeight: 1.4 }}>{hint}</span>}
      </span>
    </div>
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
