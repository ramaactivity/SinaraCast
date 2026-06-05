"use client";
import React from "react";
import { Icons } from "./icons";
import { Button } from "./ui";
const { useEffect, useRef } = React;
const F = "var(--font)";

// Full-screen image viewer with prev/next, a thumbnail filmstrip, keyboard
// (←/→/Esc) + swipe, and a delete action. `index` opens it; null = closed.
export function Lightbox({ imgs = [], index, onClose, onIndex, onDelete, ratio = 16 / 9 }) {
  const stripRef = useRef(null);
  const touch = useRef(null);
  const open = index != null && imgs.length > 0;
  const i = open ? Math.max(0, Math.min(index, imgs.length - 1)) : 0;

  const go = (d) => onIndex((i + d + imgs.length) % imgs.length);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, i, imgs.length]);

  // keep the active filmstrip thumb in view
  useEffect(() => {
    if (!open || !stripRef.current) return;
    const el = stripRef.current.children[i];
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [open, i]);

  if (!open) return null;
  const cur = imgs[i];
  const single = imgs.length < 2;

  const arrow = (dir) => (
    <button onClick={(e) => { e.stopPropagation(); go(dir); }} aria-label={dir < 0 ? "Sebelumnya" : "Berikutnya"}
      style={{ flex: "0 0 auto", width: 46, height: 46, borderRadius: "50%", border: "none", cursor: single ? "default" : "pointer",
        background: "rgba(255,255,255,.14)", color: "#fff", display: "grid", placeItems: "center", opacity: single ? 0.25 : 1,
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", transition: "background .15s" }}
      onMouseEnter={(e) => !single && (e.currentTarget.style.background = "rgba(255,255,255,.26)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.14)")} disabled={single}>
      {dir < 0 ? <Icons.chevLeft size={24} /> : <Icons.chevRight size={24} />}
    </button>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", flexDirection: "column",
      background: "rgba(18,20,28,.86)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", animation: "scFade .16s" }}>

      {/* top bar */}
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", flex: "0 0 auto" }}>
        <span style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.82)", background: "rgba(255,255,255,.12)", padding: "6px 12px", borderRadius: 999 }}>{i + 1} / {imgs.length}</span>
        <button onClick={onClose} aria-label="Tutup" style={{ width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer", background: "rgba(255,255,255,.12)", color: "#fff", display: "grid", placeItems: "center" }}><Icons.x size={20} /></button>
      </div>

      {/* stage: full-width image with floating arrows */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 12px" }}>
        <div onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
          onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - (touch.current ?? 0); if (Math.abs(dx) > 44) go(dx < 0 ? 1 : -1); }}
          style={{ width: "100%", height: "100%", minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img key={cur?.url} src={cur?.url} alt="" draggable={false}
            style={{ maxHeight: "100%", maxWidth: "100%", aspectRatio: String(1 / ratio), objectFit: "contain", borderRadius: 18,
              boxShadow: "0 24px 60px rgba(0,0,0,.5)", background: "rgba(255,255,255,.06)", animation: "scFade .18s" }} />
        </div>
        <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>{arrow(-1)}</div>
        <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>{arrow(1)}</div>
      </div>

      {/* actions */}
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", justifyContent: "center", padding: "14px 18px 6px", flex: "0 0 auto" }}>
        <Button variant="danger" icon={<Icons.trash size={16} />} onClick={() => onDelete(i)}>Hapus gambar</Button>
      </div>

      {/* filmstrip */}
      <div onClick={(e) => e.stopPropagation()} ref={stripRef} className="sc-scroll"
        style={{ display: "flex", gap: 10, padding: "12px 18px 20px", overflowX: "auto", flex: "0 0 auto", justifyContent: imgs.length > 6 ? "flex-start" : "center" }}>
        {imgs.map((im, k) => (
          <button key={im.storage_path || k} onClick={() => onIndex(k)} aria-label={`Gambar ${k + 1}`}
            style={{ flex: "0 0 auto", width: 48, padding: 0, border: "none", cursor: "pointer", borderRadius: 9, background: "transparent", lineHeight: 0 }}>
            <img src={im.url} alt="" draggable={false}
              style={{ width: 48, aspectRatio: String(1 / ratio), objectFit: "cover", borderRadius: 9, display: "block",
                border: k === i ? "2.5px solid var(--primary-400)" : "2.5px solid transparent",
                boxShadow: k === i ? "0 6px 16px rgba(249,168,38,.5)" : "none",
                opacity: k === i ? 1 : 0.55, transform: k === i ? "translateY(-2px)" : "none", transition: "opacity .15s, transform .15s, border-color .15s" }} />
          </button>
        ))}
      </div>
    </div>
  );
}
