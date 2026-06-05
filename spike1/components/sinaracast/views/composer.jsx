"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Topbar } from "../shell";
import { uploadPoolImage, uploadReelVideo, createScheduledPost, loadScheduledPost, updateScheduledPost, deleteScheduledPost } from "../dataLayer";
import { BRANDS, BrandAvatar, Panel, Button, Field, Textarea, TimeField, Segmented, MediaThumb, SectionTitle, Spinner, Chip, Input, Select } from "../ui";
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

  const [type, setType] = uCo("story");
  const [media, setMedia] = uCo([]); // [{ storage_path, url, width, height, format, bytes, aspect_ok, assetId? }]
  const [caption, setCaption] = uCo("");
  const [firstComment, setFirstComment] = uCo("");
  const [date, setDate] = uCo(todayWib());
  const [time, setTime] = uCo("09:00");
  const [uploading, setUploading] = uCo(false);
  const [saving, setSaving] = uCo(false);
  const [loading, setLoading] = uCo(!!postId);
  const [origStatus, setOrigStatus] = uCo(null); // existing status when editing
  const [view, setView] = uCo(null); // lightbox index, or null
  const fileRef = useRef(null);

  // Load existing one-off when editing.
  useEffect(() => {
    if (!postId) return;
    let active = true;
    loadScheduledPost(postId).then(({ post, media: m }) => {
      if (!active || !post) { if (active) setLoading(false); return; }
      setType(post.post_type === "feed" ? "feed" : post.post_type === "reels" ? "reels" : "story");
      setCaption(post.caption || "");
      setFirstComment(post.first_comment || "");
      setOrigStatus(post.status);
      if (post.scheduled_at) { const p = isoToWibParts(post.scheduled_at); setDate(p.date); setTime(p.time); }
      setMedia(m || []);
      setLoading(false);
    }).catch(() => active && setLoading(false));
    return () => { active = false; };
  }, [postId]);

  const isFeed = type === "feed";
  const isReels = type === "reels";
  const hasCaption = isFeed || isReels;
  const capLimit = 2200;
  const overCap = caption.length > capLimit;
  // Feed needs a caption; Story/Reels caption is optional. All need media.
  const valid = media.length > 0 && !overCap && (!isFeed || caption.trim());
  // Postingan yang sudah terbit tidak bisa dijadwalkan ulang (cegah terbit dua kali).
  const locked = !!postId && ["published", "publishing"].includes(origStatus);

  if (!channel) {
    return (
      <div>
        <Topbar title="Buat Postingan" />
        <Panel pad={0}><div style={{ padding: 40, textAlign: "center", fontFamily: FCo, color: "var(--ink-400)" }}>Sambungkan akun Instagram dulu sebelum membuat postingan.<div style={{ marginTop: 14 }}><Button variant="secondary" onClick={() => app.go("connections")}>Buka Manajemen Akun</Button></div></div></Panel>
      </div>
    );
  }

  async function onFiles(e) {
    const files = [...(e.target.files || [])]; e.target.value = "";
    for (const file of files) {
      if (isReels) {
        if (!["video/mp4", "video/quicktime"].includes(file.type)) { app.toast("Reels harus video MP4/MOV", "error"); continue; }
        if (file.size > MAX_VIDEO_MB * 1024 * 1024) { app.toast(`Video maksimal ${MAX_VIDEO_MB} MB`, "error"); continue; }
        let meta; try { meta = await readVideoMeta(file); } catch { app.toast("Gagal membaca video", "error"); continue; }
        const vr = meta.width / meta.height;
        if (Math.abs(vr - 9 / 16) > 0.06) { app.toast(`Reels sebaiknya 9:16 — video ini ${meta.width}×${meta.height}`, "error"); continue; }
        if (meta.duration && meta.duration > 90) { app.toast("Reels maksimal 90 detik", "error"); continue; }
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
        if (Math.abs(meta.width / meta.height - 9 / 16) > 0.06) { app.toast(`Story video sebaiknya 9:16 — video ini ${meta.width}×${meta.height}`, "error"); continue; }
        if (meta.duration && meta.duration > 60) { app.toast("Story video maksimal 60 detik", "error"); continue; }
        setUploading(true);
        try { const row = await uploadReelVideo(file, channel.id, meta); setMedia([row]); app.toast("Video diunggah ✓", "success"); }
        catch (err) { app.toast("Gagal unggah: " + (err.message || err), "error"); }
        finally { setUploading(false); }
        continue;
      }
      if (isFeed && media.length >= 10) { app.toast("Carousel maksimal 10 gambar", "info"); break; }
      if (!["image/jpeg", "image/png"].includes(file.type)) { app.toast("Hanya JPG / PNG", "error"); continue; }
      if (file.size > 8 * 1024 * 1024) { app.toast("Maksimal 8 MB", "error"); continue; }
      let dim; try { dim = await readDims(file); } catch { app.toast("Gagal membaca gambar", "error"); continue; }
      // Story requires 9:16; Feed accepts 4:5 (0.8) up to 1.91:1 landscape.
      const ratio = dim.width / dim.height;
      if (isFeed) {
        if (ratio < 0.8 || ratio > 1.91) { app.toast(`Feed harus rasio 4:5 s/d 1.91:1 — gambar ini ${dim.width}×${dim.height}`, "error"); continue; }
      } else if (Math.abs(ratio - 9 / 16) > 0.04) { app.toast(`Story harus 9:16 — gambar ini ${dim.width}×${dim.height}`, "error"); continue; }
      setUploading(true);
      try {
        const row = await uploadPoolImage(file, channel.id, dim);
        setMedia(m => isFeed ? [...m, row] : [row]);
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
    const payload = {
      channelDbId: channel._id, postType: type, caption: hasCaption ? caption.trim() : null,
      firstComment: hasCaption ? firstComment.trim() : null, scheduledAtISO: scheduledISO(), status, images: media,
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
            <Segmented full options={[{ value: "story", label: "Story" }, { value: "feed", label: "Feed" }, { value: "reels", label: "Reels" }]} value={type} onChange={(v) => { setType(v); setMedia([]); }} />
            {isFeed && <div style={{ display: "flex", gap: 9, marginTop: 12, background: "var(--st-publishing-bg)", borderRadius: 11, padding: "10px 12px" }}>
              <Icons.info size={15} style={{ color: "var(--st-publishing)", flex: "0 0 auto", marginTop: 1 }} />
              <span style={{ fontFamily: FCo, fontSize: 11.5, color: "var(--ink-600)", lineHeight: 1.45 }}>Feed terbit otomatis: 1 gambar atau carousel 2–10 gambar. Ukuran 4:5 sampai 1.91:1. Komentar pertama diposting otomatis setelah feed terbit.</span>
            </div>}
            {isReels && <div style={{ display: "flex", gap: 9, marginTop: 12, background: "var(--st-publishing-bg)", borderRadius: 11, padding: "10px 12px" }}>
              <Icons.film size={15} style={{ color: "var(--st-publishing)", flex: "0 0 auto", marginTop: 1 }} />
              <span style={{ fontFamily: FCo, fontSize: 11.5, color: "var(--ink-600)", lineHeight: 1.45 }}>Reels terbit otomatis: 1 video tegak 9:16, format MP4/MOV, maks {MAX_VIDEO_MB} MB, durasi ≤ 90 detik. Caption & komentar pertama opsional.</span>
            </div>}
          </Panel>
          <Panel>
            <SectionTitle sub={isReels ? "Satu video tegak 9:16" : isFeed ? "Sampai 10 gambar (carousel)" : "Satu gambar atau video tegak 9:16"} right={<Button size="sm" variant="secondary" icon={uploading ? <Spinner size={15} /> : <Icons.upload size={15} />} disabled={uploading} onClick={() => fileRef.current?.click()}>{(media.length >= 1 && (isReels || type === "story")) ? "Ganti" : "Unggah"}</Button>}>{isReels ? "Video" : isFeed ? "Gambar" : "Media"}</SectionTitle>
            <input ref={fileRef} type="file" accept={isReels ? "video/mp4,video/quicktime" : isFeed ? "image/jpeg,image/png" : "image/jpeg,image/png,video/mp4,video/quicktime"} multiple={isFeed} onChange={onFiles} style={{ display: "none" }} />
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
              {!media.length && <div style={{ fontFamily: FCo, fontSize: 12.5, color: "var(--ink-400)", padding: "10px 2px" }}>{isReels ? "Belum ada video. Klik Unggah untuk menambahkan." : isFeed ? "Belum ada gambar. Klik Unggah untuk menambahkan." : "Belum ada media. Unggah gambar atau video."}</div>}
            </div>
          </Panel>

          {hasCaption && (
            <Panel>
              <SectionTitle sub={`${caption.length} / ${capLimit} karakter${isReels ? " · opsional" : ""}`}>Tulisan (caption)</SectionTitle>
              <Textarea placeholder={isReels ? "Tulis caption Reels (opsional)…" : "Tulis caption postingan…"} value={caption} invalid={overCap} onChange={e => setCaption(e.target.value)} style={{ minHeight: 120 }} />
              {overCap && <div style={{ fontFamily: FCo, fontSize: 11.5, color: "var(--danger)", marginTop: 6 }}>Kepanjangan, maksimal {capLimit} karakter.</div>}
              <Field label="Komentar pertama (untuk hashtag)" hint="Diposting otomatis di kolom komentar setelah postingan terbit." style={{ marginTop: 16 }}>
                <Textarea value={firstComment} onChange={e => setFirstComment(e.target.value)} style={{ minHeight: 64 }} placeholder="#hashtag …" />
              </Field>
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
                ? <MediaThumb seed={0} w={140} ratio={isFeed ? 1 : 16 / 9} label={isReels ? "Reels 9:16" : isFeed ? "Feed" : "Story 9:16"} />
                : isVid(media[0])
                  ? <div onClick={() => setView(0)} title="Klik untuk pratinjau" style={{ position: "relative", cursor: "zoom-in", lineHeight: 0 }}>
                      <video src={media[0].url} muted playsInline preload="metadata" style={{ width: 150, aspectRatio: "9/16", objectFit: "cover", borderRadius: 14, border: "1px solid var(--line)", background: "#000", display: "block" }} />
                      <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,.6)", pointerEvents: "none" }}><Icons.play size={30} /></span>
                    </div>
                  : <MediaThumb seed={0} src={media[0].url} w={140} ratio={isFeed ? 1 : 16 / 9} label={isReels ? "Reels 9:16" : isFeed ? "Feed" : "Story 9:16"} onClick={() => setView(0)} />}
            </div>
            {hasCaption && caption && <p style={{ fontFamily: FCo, fontSize: 12, color: "var(--ink-600)", lineHeight: 1.5, marginTop: 12, maxHeight: 70, overflow: "hidden" }}><b style={{ color: "var(--ink-900)" }}>{channel.handle.replace(/^@/, "")}</b> {caption}</p>}
          </Panel>
        </div>
      </div>

      <Lightbox imgs={media} index={view} onClose={() => setView(null)} onIndex={setView}
        ratio={isFeed ? null : 16 / 9}
        onDelete={(idx) => { const remaining = media.length - 1; setMedia(ms => ms.filter((_, x) => x !== idx)); setView(remaining <= 0 ? null : Math.min(idx, remaining - 1)); }} />
    </div>
  );
}
