"use client";
import React from "react";
import { createPortal } from "react-dom";
import { Icons } from "./icons";
const { useEffect, useRef } = React;
const F = "var(--font)";

const isVideoItem = (im) => !!(im && (im.isVideo || ["mp4", "mov"].includes(im.format) || /\.(mp4|mov)(\?|$)/i.test(im.url || "")));

// Full-screen media viewer in the SinaraCast design language (soft glass scrim,
// light DS controls). Supports images AND video. prev/next, a thumbnail
// filmstrip, keyboard (←/→/Esc) + swipe, and a delete action. `index` opens it;
// null = closed. `ratio` = height/width for the frame; pass null for natural
// aspect (e.g. mixed-ratio Feed images).
export function Lightbox({ imgs = [], index, onClose, onIndex, onDelete, onReplace, ratio = 16 / 9 }) {
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

  useEffect(() => {
    if (!open || !stripRef.current) return;
    stripRef.current.children[i]?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [open, i]);

  if (!open || typeof document === "undefined") return null;
  const cur = imgs[i];
  const single = imgs.length < 2;
  const aspect = ratio ? String(1 / ratio) : undefined;
  const thumbAspect = String(1 / (ratio || 1));
  const mediaStyle = { maxHeight: "100%", maxWidth: "100%", aspectRatio: aspect, objectFit: "contain", borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-lg)", animation: "scPop .2s" };

  const kind = isVideoItem(cur) ? "video" : "gambar";
  const circleBtn = { width: 46, height: 46, borderRadius: "50%", border: "1px solid var(--line)", background: "#fff",
    color: "var(--ink-700)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-md)", transition: "box-shadow .15s, transform .12s" };
  const pill = (danger) => ({ height: 42, padding: "0 16px", borderRadius: 999, border: "1px solid var(--line)", background: "#fff",
    color: danger ? "var(--danger, #e5484d)" : "var(--ink-600)", display: "inline-flex", alignItems: "center", gap: 7,
    fontFamily: F, fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "var(--shadow-sm)", whiteSpace: "nowrap", transition: "box-shadow .15s, transform .12s" });
  const lift = (e) => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.transform = "translateY(-1px)"; };
  const drop = (e) => { e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.transform = "none"; };
  const arrow = (dir) => (
    <button onClick={(e) => { e.stopPropagation(); go(dir); }} aria-label={dir < 0 ? "Sebelumnya" : "Berikutnya"} disabled={single}
      style={{ ...circleBtn, cursor: single ? "default" : "pointer", opacity: single ? 0.4 : 1 }}
      onMouseEnter={(e) => { if (!single) { e.currentTarget.style.boxShadow = "var(--shadow-lg)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.transform = "none"; }}>
      {dir < 0 ? <Icons.chevLeft size={22} /> : <Icons.chevRight size={22} />}
    </button>
  );

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", flexDirection: "column",
      background: "rgba(62,67,81,.34)", backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)", animation: "scFade .18s" }}>

      {/* top bar: counter • actions (Ganti / Hapus) • close */}
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "16px 18px", flex: "0 0 auto" }}>
        <span style={{ fontFamily: F, fontSize: 12.5, fontWeight: 600, color: "var(--ink-500)", background: "#fff", padding: "7px 13px", borderRadius: 999, boxShadow: "var(--shadow-sm)", border: "1px solid var(--line)" }}>{i + 1} / {imgs.length}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {onReplace && (
            <button onClick={() => onReplace(i)} style={pill(false)} onMouseEnter={lift} onMouseLeave={drop} title={`Ganti ${kind}`}>
              <Icons.swap size={16} /><span style={{ display: "inline" }}>Ganti</span>
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(i)} style={pill(true)} onMouseEnter={lift} onMouseLeave={drop} title={`Hapus ${kind}`}>
              <Icons.trash size={16} /><span style={{ display: "inline" }}>Hapus</span>
            </button>
          )}
          <button onClick={onClose} aria-label="Tutup" style={{ width: 42, height: 42, borderRadius: "50%", border: "1px solid var(--line)", cursor: "pointer", background: "#fff", color: "var(--ink-500)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-sm)", flex: "0 0 auto" }}><Icons.x size={20} /></button>
        </div>
      </div>

      {/* stage: arrows flank the media (vertical padding gives breathing room so tall 9:16 media never touches the edges) */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: single ? "14px 14px 40px" : "8px 14px 16px" }}>
        {arrow(-1)}
        <div onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
          onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - (touch.current ?? 0); if (Math.abs(dx) > 44) go(dx < 0 ? 1 : -1); }}
          style={{ flex: "0 1 auto", minWidth: 0, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isVideoItem(cur)
            ? <video key={cur?.url} src={cur?.url} controls autoPlay muted loop playsInline style={{ ...mediaStyle, background: "#000" }} />
            : <img key={cur?.url} src={cur?.url} alt="" draggable={false} style={{ ...mediaStyle, background: "#fff", border: "1px solid var(--glass-border)" }} />}
        </div>
        {arrow(1)}
      </div>

      {/* filmstrip */}
      {!single && (
      <div onClick={(e) => e.stopPropagation()} ref={stripRef} className="sc-scroll"
        style={{ display: "flex", gap: 10, padding: "16px 18px 22px", overflowX: "auto", flex: "0 0 auto", justifyContent: imgs.length > 6 ? "flex-start" : "center" }}>
        {imgs.map((im, k) => {
          const active = k === i;
          const thumbStyle = { width: 48, aspectRatio: thumbAspect, objectFit: "cover", borderRadius: 10, display: "block",
            border: active ? "2.5px solid var(--primary-400)" : "2.5px solid #fff",
            boxShadow: active ? "var(--shadow-primary)" : "var(--shadow-sm)",
            opacity: active ? 1 : 0.7, transform: active ? "translateY(-2px)" : "none", transition: "opacity .15s, transform .15s, border-color .15s, box-shadow .15s" };
          return (
            <button key={im.storage_path || k} onClick={() => onIndex(k)} aria-label={`Media ${k + 1}`} style={{ flex: "0 0 auto", padding: 0, border: "none", cursor: "pointer", background: "transparent", lineHeight: 0, position: "relative" }}>
              {isVideoItem(im) ? <video src={im.url} muted playsInline preload="metadata" style={{ ...thumbStyle, background: "#000" }} /> : <img src={im.url} alt="" draggable={false} style={thumbStyle} />}
              {isVideoItem(im) && <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,.5)", pointerEvents: "none" }}><Icons.play size={16} /></span>}
            </button>
          );
        })}
      </div>
      )}
    </div>,
    document.body
  );
}
