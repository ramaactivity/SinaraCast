"use client";
import React from "react";
import { createPortal } from "react-dom";
import { Icons } from "./icons";
import { Button } from "./ui";
const { useEffect, useRef } = React;
const F = "var(--font)";

// Full-screen image viewer styled in the SinaraCast design language (soft glass
// scrim, light DS controls — matches the app's other modals). prev/next, a
// thumbnail filmstrip, keyboard (←/→/Esc) + swipe, and a delete action.
// `index` opens it; null = closed.
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

  const circleBtn = { width: 46, height: 46, borderRadius: "50%", border: "1px solid var(--line)", background: "#fff",
    color: "var(--ink-700)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-md)", transition: "box-shadow .15s, transform .12s" };

  const arrow = (dir) => (
    <button onClick={(e) => { e.stopPropagation(); go(dir); }} aria-label={dir < 0 ? "Sebelumnya" : "Berikutnya"} disabled={single}
      style={{ ...circleBtn, cursor: single ? "default" : "pointer", opacity: single ? 0.4 : 1 }}
      onMouseEnter={(e) => { if (!single) { e.currentTarget.style.boxShadow = "var(--shadow-lg)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.transform = "none"; }}>
      {dir < 0 ? <Icons.chevLeft size={22} /> : <Icons.chevRight size={22} />}
    </button>
  );

  if (typeof document === "undefined") return null;
  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", flexDirection: "column",
      background: "rgba(62,67,81,.34)", backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)", animation: "scFade .18s" }}>

      {/* top bar */}
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", flex: "0 0 auto" }}>
        <span style={{ fontFamily: F, fontSize: 12.5, fontWeight: 600, color: "var(--ink-500)", background: "#fff", padding: "7px 13px", borderRadius: 999, boxShadow: "var(--shadow-sm)", border: "1px solid var(--line)" }}>{i + 1} / {imgs.length}</span>
        <button onClick={onClose} aria-label="Tutup" style={{ width: 42, height: 42, borderRadius: "50%", border: "1px solid var(--line)", cursor: "pointer", background: "#fff", color: "var(--ink-500)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-sm)" }}><Icons.x size={20} /></button>
      </div>

      {/* stage: full-width image with floating arrows */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 12px" }}>
        <div onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
          onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - (touch.current ?? 0); if (Math.abs(dx) > 44) go(dx < 0 ? 1 : -1); }}
          style={{ width: "100%", height: "100%", minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img key={cur?.url} src={cur?.url} alt="" draggable={false}
            style={{ maxHeight: "100%", maxWidth: "100%", aspectRatio: String(1 / ratio), objectFit: "contain", borderRadius: "var(--r-lg)",
              boxShadow: "var(--shadow-lg)", background: "#fff", border: "1px solid var(--glass-border)", animation: "scPop .2s" }} />
        </div>
        <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>{arrow(-1)}</div>
        <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)" }}>{arrow(1)}</div>
      </div>

      {/* actions */}
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", justifyContent: "center", padding: "14px 18px 4px", flex: "0 0 auto" }}>
        <Button variant="danger" icon={<Icons.trash size={16} />} onClick={() => onDelete(i)}>Hapus gambar</Button>
      </div>

      {/* filmstrip */}
      <div onClick={(e) => e.stopPropagation()} ref={stripRef} className="sc-scroll"
        style={{ display: "flex", gap: 10, padding: "12px 18px 20px", overflowX: "auto", flex: "0 0 auto", justifyContent: imgs.length > 6 ? "flex-start" : "center" }}>
        {imgs.map((im, k) => (
          <button key={im.storage_path || k} onClick={() => onIndex(k)} aria-label={`Gambar ${k + 1}`}
            style={{ flex: "0 0 auto", width: 48, padding: 0, border: "none", cursor: "pointer", borderRadius: 10, background: "transparent", lineHeight: 0 }}>
            <img src={im.url} alt="" draggable={false}
              style={{ width: 48, aspectRatio: String(1 / ratio), objectFit: "cover", borderRadius: 10, display: "block",
                border: k === i ? "2.5px solid var(--primary-400)" : "2.5px solid #fff",
                boxShadow: k === i ? "var(--shadow-primary)" : "var(--shadow-sm)",
                opacity: k === i ? 1 : 0.7, transform: k === i ? "translateY(-2px)" : "none", transition: "opacity .15s, transform .15s, border-color .15s, box-shadow .15s" }} />
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}
