"use client";
import React from "react";
import { Icons } from "../icons";
import { MOCK } from "../mockdata";
import { useApp } from "../store";
import { Topbar } from "../shell";
import { BRANDS, BrandAvatar, Panel, Button, Field, Textarea, TimeField, Segmented, MediaThumb, SectionTitle, Spinner, Chip, Input } from "../ui";
const { useState: uCo } = React;
const FCo = "var(--font)";

const REFINED = {
  default: "Ngopi sore makin nikmat bareng kopi susu gula aren favoritmu ☕ Mampir ke Mahakan, kami tunggu ya!",
};

export function ComposerView() {
  const app = useApp();
  const chId = app.params.ch || app.channel;
  const b = BRANDS[chId];
  const channel = MOCK.CHANNELS.find(c => c.id === chId);

  const [type, setType] = uCo("story");
  const [media, setMedia] = uCo([0]);
  const [caption, setCaption] = uCo("");
  const [firstComment, setFirstComment] = uCo("#mahakancoffee #kopisusu #kalimantan");
  const [date, setDate] = uCo("2025-06-08");
  const [time, setTime] = uCo("15:00");
  const [refining, setRefining] = uCo(false);
  const [original, setOriginal] = uCo(null);

  const isFeed = type === "feed";
  const capLimit = 2200;
  const overCap = caption.length > capLimit;
  const valid = media.length > 0 && (!isFeed || (caption.trim() && !overCap));

  const refine = () => {
    if (!caption.trim()) { app.toast("Tulis draft caption dulu", "error"); return; }
    setOriginal(caption); setRefining(true);
    setTimeout(() => { setCaption(REFINED.default); setRefining(false); app.toast("Caption disempurnakan ke brand voice", "success"); }, 1500);
  };

  return (
    <div>
      <Topbar title="One-off post" sub={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><BrandAvatar brand={b} size={18} /> {b.name} · {channel.handle}</span>}
        right={<div style={{ display: "flex", gap: 10 }}>
          <Button variant="ghost" icon={<Icons.chevLeft size={17} />} onClick={() => app.go("calendar")}>Kembali</Button>
          <Button variant="secondary" icon={<Icons.layers size={16} />} onClick={() => app.toast("Disimpan sebagai draft", "info")}>Simpan draft</Button>
          <Button variant="primary" icon={<Icons.calendar size={16} />} disabled={!valid} onClick={() => { app.toast(`Post dijadwalkan ${date} ${time} WIB`, "success"); app.go("calendar"); }}>Jadwalkan</Button>
        </div>} />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel>
            <SectionTitle sub="Tipe konten & channel">Jenis post</SectionTitle>
            <Segmented full options={[{ value: "story", label: "Story (9:16)" }, { value: "feed", label: "Feed (caption + carousel)" }]} value={type} onChange={setType} />
          </Panel>

          <Panel>
            <SectionTitle sub={isFeed ? "Carousel hingga 10 gambar" : "Satu gambar Story 9:16"} right={<Button size="sm" variant="secondary" icon={<Icons.upload size={15} />} onClick={() => { if (!isFeed && media.length >= 1) { app.toast("Story hanya 1 gambar", "info"); return; } setMedia(m => [...m, m.length]); app.toast("Gambar divalidasi ✓", "success"); }}>Unggah</Button>}>Media</SectionTitle>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {media.map((m, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <MediaThumb seed={m} w={isFeed ? 96 : 90} ratio={isFeed ? 1 : 16 / 9} label={isFeed ? "1:1" : "9:16"} />
                  <button onClick={() => setMedia(ms => ms.filter((_, x) => x !== i))} style={{ position: "absolute", top: -7, right: -7, width: 22, height: 22, borderRadius: "50%", border: "none", cursor: "pointer", background: "#fff", color: "var(--danger)", boxShadow: "var(--shadow-sm)", display: "grid", placeItems: "center" }}><Icons.x size={13} sw={2.4} /></button>
                </div>
              ))}
              <Button variant="ghost" size="sm" icon={<Icons.image size={15} />} onClick={() => app.go("library", { ch: chId })} style={{ alignSelf: "center" }}>Dari Library</Button>
            </div>
          </Panel>

          {isFeed && (
            <Panel>
              <SectionTitle sub={`${caption.length} / ${capLimit} karakter`} right={
                <Button size="sm" variant="amber" icon={refining ? <Spinner size={15} color="#fff" /> : <Icons.sparkle size={15} />} disabled={refining} onClick={refine}>Sempurnakan</Button>
              }>Caption</SectionTitle>
              <Textarea placeholder="Tulis draft caption…" value={caption} invalid={overCap} onChange={e => setCaption(e.target.value)} style={{ minHeight: 120 }} />
              {overCap && <div style={{ fontFamily: FCo, fontSize: 11.5, color: "var(--danger)", marginTop: 6 }}>Melebihi batas {capLimit} karakter.</div>}
              {original && !refining && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Chip tone="green" icon={<Icons.sparkle size={12} />}>Disempurnakan</Chip>
                  <button onClick={() => { setCaption(original); setOriginal(null); app.toast("Dikembalikan ke draft asli", "info"); }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FCo, fontSize: 12, fontWeight: 500, color: "var(--ink-500)" }}>↩ Kembalikan asli</button>
                  <button onClick={refine} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FCo, fontSize: 12, fontWeight: 500, color: "var(--primary-500)" }}>↻ Buat ulang</button>
                </div>
              )}
              <Field label="Komentar pertama (hashtag)" hint="Otomatis diposting tepat setelah post utama terbit." style={{ marginTop: 16 }}>
                <Textarea value={firstComment} onChange={e => setFirstComment(e.target.value)} style={{ minHeight: 64 }} />
              </Field>
            </Panel>
          )}
        </div>

        {/* schedule + preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel strong>
            <SectionTitle sub="Waktu WIB">Jadwal</SectionTitle>
            <Field label="Tanggal"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
            <Field label="Jam" style={{ marginTop: 14 }}><TimeField value={time} onChange={setTime} /></Field>
            <div style={{ display: "flex", gap: 9, marginTop: 14, background: "var(--green-100)", borderRadius: 11, padding: "10px 12px" }}>
              <Icons.info size={15} style={{ color: "var(--green-500)", flex: "0 0 auto", marginTop: 1 }} />
              <span style={{ fontFamily: FCo, fontSize: 11.5, color: "var(--ink-600)", lineHeight: 1.45 }}>Terbit sekali lewat pipeline andal yang sama (retry, grace, anti double-post).</span>
            </div>
          </Panel>
          <Panel>
            <SectionTitle sub="Pratinjau">Tampilan</SectionTitle>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <MediaThumb seed={media[0] ?? 0} w={140} ratio={isFeed ? 1 : 16 / 9} label={isFeed ? "Feed 1:1" : "Story 9:16"} />
            </div>
            {isFeed && caption && <p style={{ fontFamily: FCo, fontSize: 12, color: "var(--ink-600)", lineHeight: 1.5, marginTop: 12, maxHeight: 70, overflow: "hidden" }}><b style={{ color: "var(--ink-900)" }}>{channel.handle.slice(1)}</b> {caption}</p>}
          </Panel>
        </div>
      </div>
    </div>
  );
}
