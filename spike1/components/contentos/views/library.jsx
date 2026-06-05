"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp, useFetchState } from "../store";
import { Topbar } from "../shell";
import { BRANDS, BrandAvatar, Panel, Button, Input, MediaThumb, EmptyState, Skeleton, Segmented } from "../ui";
const { useState: uLi } = React;
const FLi = "var(--font)";

const TAGS = ["Menu", "Promo", "Event", "Behind the scene", "Katalog"];
// per-brand library
function buildLib(ch) {
  const counts = { mahakan: 14, tiska: 18, tetra: 9, outentika: 12 };
  const n = counts[ch] || 10;
  return Array.from({ length: n }, (_, i) => ({ id: ch + i, seed: i, tag: TAGS[i % TAGS.length], usage: i % 3 === 0 ? "Jam buka" : i % 4 === 0 ? "Menu spesial" : null }));
}

export function MediaLibraryView() {
  const app = useApp();
  const phase = app.dataLoading ? "loading" : "ready";
  const chId = app.params.ch || app.channel;
  const b = BRANDS[chId];
  const [q, setQ] = uLi("");
  const [tag, setTag] = uLi("all");
  const items = buildLib(chId).filter(it => tag === "all" || it.tag === tag);

  return (
    <div>
      <Topbar title="Media Library" sub={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><BrandAvatar brand={b} size={18} /> {b.name} · media dapat dipakai ulang</span>}
        right={<Button variant="amber" icon={<Icons.upload size={17} />} onClick={() => app.toast("Media diunggah ke library ✓", "success")}>Unggah</Button>} />

      <Panel>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, maxWidth: 320 }}><Input icon={<Icons.search size={18} />} placeholder="Cari media…" value={q} onChange={e => setQ(e.target.value)} /></div>
          <Segmented options={[{ value: "all", label: "Semua" }, ...TAGS.map(t => ({ value: t, label: t }))]} value={tag} onChange={setTag} />
        </div>

        {phase === "loading" && <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 12 }}>{Array.from({ length: 16 }).map((_, i) => <Skeleton key={i} h={120} r={12} />)}</div>}

        {phase === "ready" && items.length === 0 && <EmptyState compact icon={<Icons.image size={26} />} title="Tidak ada media" body="Belum ada media dengan tag ini. Unggah atau ganti filter." />}

        {phase === "ready" && items.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 12 }}>
            {items.map(it => (
              <div key={it.id} style={{ position: "relative" }}>
                <MediaThumb seed={it.seed} w={"100%"} ratio={1.4} />
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
