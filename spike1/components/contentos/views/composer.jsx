"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Topbar } from "../shell";
import { uploadPoolImage, createScheduledPost } from "../dataLayer";
import { BRANDS, BrandAvatar, Panel, Button, Field, Textarea, TimeField, Segmented, MediaThumb, SectionTitle, Spinner, Chip, Input } from "../ui";
const { useState: uCo, useRef } = React;
const FCo = "var(--font)";

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
const todayWib = () => { const d = new Date(Date.now() + 7 * 3600 * 1000); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`; };

export function ComposerView() {
  const app = useApp();
  const chId = app.params.ch || app.channel;
  const channel = app.channels.find(c => c.id === chId);
  const b = brandFor(chId, app.channels);

  const [type, setType] = uCo("story");
  const [media, setMedia] = uCo([]); // [{ storage_path, url, width, height, format, bytes, aspect_ok }]
  const [caption, setCaption] = uCo("");
  const [firstComment, setFirstComment] = uCo("");
  const [date, setDate] = uCo(todayWib());
  const [time, setTime] = uCo("09:00");
  const [uploading, setUploading] = uCo(false);
  const [saving, setSaving] = uCo(false);
  const fileRef = useRef(null);

  const isFeed = type === "feed";
  const capLimit = 2200;
  const overCap = caption.length > capLimit;
  const valid = media.length > 0 && (!isFeed || (caption.trim() && !overCap));

  if (!channel) {
    return (
      <div>
        <Topbar title="One-off post" />
        <Panel pad={0}><div style={{ padding: 40, textAlign: "center", fontFamily: FCo, color: "var(--ink-400)" }}>Pilih channel dari Calendar dulu.<div style={{ marginTop: 14 }}><Button variant="secondary" onClick={() => app.go("calendar")}>Kembali ke Calendar</Button></div></div></Panel>
      </div>
    );
  }

  async function onFiles(e) {
    const files = [...(e.target.files || [])]; e.target.value = "";
    for (const file of files) {
      if (!isFeed && media.length >= 1) { app.toast("Story hanya 1 gambar", "info"); break; }
      if (isFeed && media.length >= 10) { app.toast("Carousel maksimal 10 gambar", "info"); break; }
      if (!["image/jpeg", "image/png"].includes(file.type)) { app.toast("Hanya JPG / PNG", "error"); continue; }
      if (file.size > 8 * 1024 * 1024) { app.toast("Maksimal 8 MB", "error"); continue; }
      let dim; try { dim = await readDims(file); } catch { app.toast("Gagal membaca gambar", "error"); continue; }
      // Story requires 9:16; Feed is flexible (portrait/square up to 1.91:1 landscape).
      if (!isFeed && Math.abs(dim.width / dim.height - 9 / 16) > 0.04) { app.toast(`Story harus 9:16 — gambar ini ${dim.width}×${dim.height}`, "error"); continue; }
      setUploading(true);
      try {
        const row = await uploadPoolImage(file, chId, dim);
        setMedia(m => [...m, row]);
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
    try {
      await createScheduledPost({
        channelDbId: channel._id, postType: type, caption: isFeed ? caption.trim() : null,
        firstComment: isFeed ? firstComment.trim() : null,
        scheduledAtISO: status === "draft" && !date ? null : scheduledISO(), status,
        images: media,
      });
      await app.reload();
      app.toast(status === "scheduled" ? `Post dijadwalkan ${date} ${time} WIB` : "Disimpan sebagai draft", "success");
      app.go("calendar");
    } catch (e) {
      app.toast("Gagal menyimpan: " + (e.message || e), "error");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <Topbar title="One-off post" sub={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><BrandAvatar brand={b} size={18} /> {b.name} · {channel.handle}</span>}
        right={<div style={{ display: "flex", gap: 10 }}>
          <Button variant="ghost" icon={<Icons.chevLeft size={17} />} onClick={() => app.go("calendar")}>Kembali</Button>
          <Button variant="secondary" icon={saving ? <Spinner size={15} /> : <Icons.layers size={16} />} disabled={saving || !media.length} onClick={() => save("draft")}>Simpan draft</Button>
          <Button variant="primary" icon={saving ? <Spinner size={15} color="#fff" /> : <Icons.calendar size={16} />} disabled={!valid || saving || isFeed} onClick={() => save("scheduled")}>Jadwalkan</Button>
        </div>} />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel>
            <SectionTitle sub="Tipe konten & channel">Jenis post</SectionTitle>
            <Segmented full options={[{ value: "story", label: "Story (9:16)" }, { value: "feed", label: "Feed (caption + carousel)" }]} value={type} onChange={(v) => { setType(v); setMedia([]); }} />
            {isFeed && <div style={{ display: "flex", gap: 9, marginTop: 12, background: "var(--st-publishing-bg)", borderRadius: 11, padding: "10px 12px" }}>
              <Icons.info size={15} style={{ color: "var(--st-publishing)", flex: "0 0 auto", marginTop: 1 }} />
              <span style={{ fontFamily: FCo, fontSize: 11.5, color: "var(--ink-600)", lineHeight: 1.45 }}>Feed bisa disimpan sebagai draft. Auto-publish Feed/carousel segera hadir — sekarang yang terbit otomatis baru Story.</span>
            </div>}
          </Panel>

          <Panel>
            <SectionTitle sub={isFeed ? "Carousel hingga 10 gambar" : "Satu gambar Story 9:16"} right={<Button size="sm" variant="secondary" icon={uploading ? <Spinner size={15} /> : <Icons.upload size={15} />} disabled={uploading} onClick={() => fileRef.current?.click()}>Unggah</Button>}>Media</SectionTitle>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" multiple={isFeed} onChange={onFiles} style={{ display: "none" }} />
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {media.map((m, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <MediaThumb seed={i} src={m.url} w={isFeed ? 96 : 90} ratio={isFeed ? 1 : 16 / 9} label={isFeed ? "Feed" : "9:16"} />
                  <button onClick={() => setMedia(ms => ms.filter((_, x) => x !== i))} style={{ position: "absolute", top: -7, right: -7, width: 22, height: 22, borderRadius: "50%", border: "none", cursor: "pointer", background: "#fff", color: "var(--danger)", boxShadow: "var(--shadow-sm)", display: "grid", placeItems: "center" }}><Icons.x size={13} sw={2.4} /></button>
                </div>
              ))}
              {!media.length && <div style={{ fontFamily: FCo, fontSize: 12.5, color: "var(--ink-400)", padding: "10px 2px" }}>Belum ada media — klik Unggah.</div>}
            </div>
          </Panel>

          {isFeed && (
            <Panel>
              <SectionTitle sub={`${caption.length} / ${capLimit} karakter`}>Caption</SectionTitle>
              <Textarea placeholder="Tulis caption…" value={caption} invalid={overCap} onChange={e => setCaption(e.target.value)} style={{ minHeight: 120 }} />
              {overCap && <div style={{ fontFamily: FCo, fontSize: 11.5, color: "var(--danger)", marginTop: 6 }}>Melebihi batas {capLimit} karakter.</div>}
              <Field label="Komentar pertama (hashtag)" hint="Diposting setelah post utama terbit." style={{ marginTop: 16 }}>
                <Textarea value={firstComment} onChange={e => setFirstComment(e.target.value)} style={{ minHeight: 64 }} placeholder="#hashtag …" />
              </Field>
            </Panel>
          )}
        </div>

        {/* schedule + preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel strong>
            <SectionTitle sub="Waktu WIB">Jadwal</SectionTitle>
            <Field label="Tanggal"><Input type="date" value={date} min={todayWib()} onChange={e => setDate(e.target.value)} /></Field>
            <Field label="Jam" style={{ marginTop: 14 }}><TimeField value={time} onChange={setTime} /></Field>
            <div style={{ display: "flex", gap: 9, marginTop: 14, background: "var(--green-100)", borderRadius: 11, padding: "10px 12px" }}>
              <Icons.info size={15} style={{ color: "var(--green-500)", flex: "0 0 auto", marginTop: 1 }} />
              <span style={{ fontFamily: FCo, fontSize: 11.5, color: "var(--ink-600)", lineHeight: 1.45 }}>{isFeed ? "Feed disimpan sebagai draft (auto-publish menyusul)." : "Story terbit sekali lewat pipeline andal yang sama (anti double-post)."}</span>
            </div>
          </Panel>
          <Panel>
            <SectionTitle sub="Pratinjau">Tampilan</SectionTitle>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <MediaThumb seed={0} src={media[0]?.url} w={140} ratio={isFeed ? 1 : 16 / 9} label={isFeed ? "Feed" : "Story 9:16"} />
            </div>
            {isFeed && caption && <p style={{ fontFamily: FCo, fontSize: 12, color: "var(--ink-600)", lineHeight: 1.5, marginTop: 12, maxHeight: 70, overflow: "hidden" }}><b style={{ color: "var(--ink-900)" }}>{channel.handle.replace(/^@/, "")}</b> {caption}</p>}
          </Panel>
        </div>
      </div>
    </div>
  );
}
