"use client";
import React from "react";
import { createPortal } from "react-dom";
import { Icons } from "./icons";
import { t } from "./i18n";
const { useEffect, useRef } = React;
const F = "var(--font)";

const isVideoItem = (im) => !!(im && (im.isVideo || ["mp4", "mov"].includes(im.format) || /\.(mp4|mov)(\?|$)/i.test(im.url || "")));

// Frosted-glass control surface — translucent + blurred so the controls feel
// part of the scrim (premium, seamless) instead of solid white blocks.
const gShadow = "0 10px 30px -12px rgba(28,32,44,.32), inset 0 1px 0 rgba(255,255,255,.85)";
const gShadowHi = "0 18px 44px -14px rgba(28,32,44,.46), inset 0 1px 0 rgba(255,255,255,.95)";
const glass = {
  background: "rgba(255,255,255,.76)",
  backdropFilter: "blur(16px) saturate(1.6)", WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,.62)", boxShadow: gShadow,
};

// Full-screen media viewer in the SinaraCast design language (soft glass scrim,
// frosted controls). Supports images AND video. prev/next, a thumbnail
// filmstrip, keyboard (←/→/Esc) + swipe, and Ganti/Hapus actions. `index` opens
// it; null = closed. `ratio` = height/width for the frame; pass null for natural
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
  const vid = isVideoItem(cur);
  const aspect = ratio ? String(1 / ratio) : undefined;
  const thumbAspect = String(1 / (ratio || 1));
  const kind = vid ? t("video") : t("gambar");

  // Layered, soft drop shadow so the media floats above the scrim.
  const mediaStyle = { maxHeight: "100%", maxWidth: "100%", aspectRatio: aspect, objectFit: "contain",
    borderRadius: 20, boxShadow: "0 32px 70px -28px rgba(16,18,26,.62), 0 12px 30px -18px rgba(16,18,26,.4)", animation: "scLbIn .26s cubic-bezier(.2,.8,.25,1)" };

  const lift = (e) => { e.currentTarget.style.boxShadow = gShadowHi; e.currentTarget.style.transform = "translateY(-1px)"; };
  const drop = (e) => { e.currentTarget.style.boxShadow = gShadow; e.currentTarget.style.transform = "none"; };

  const pill = (danger) => ({ ...glass, height: 42, padding: "0 16px", borderRadius: 999,
    color: danger ? "var(--danger, #e5484d)" : "var(--ink-700)", display: "inline-flex", alignItems: "center", gap: 7,
    fontFamily: F, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "box-shadow .16s, transform .14s" });

  const arrow = (dir) => single ? null : (
    <button onClick={(e) => { e.stopPropagation(); go(dir); }} aria-label={dir < 0 ? t("Sebelumnya") : t("Berikutnya")}
      style={{ ...glass, width: 50, height: 50, borderRadius: "50%", color: "var(--ink-700)", display: "grid", placeItems: "center", cursor: "pointer", flex: "0 0 auto", transition: "box-shadow .16s, transform .16s" }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = gShadowHi; e.currentTarget.style.transform = "scale(1.07)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = gShadow; e.currentTarget.style.transform = "none"; }}>
      {dir < 0 ? <Icons.chevLeft size={22} /> : <Icons.chevRight size={22} />}
    </button>
  );

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", flexDirection: "column",
      background: "radial-gradient(130% 95% at 50% 36%, rgba(68,73,90,.28) 0%, rgba(42,46,58,.52) 100%)",
      backdropFilter: "blur(9px) saturate(1.18)", WebkitBackdropFilter: "blur(9px) saturate(1.18)", animation: "scFade .2s" }}>

      {/* top bar: counter • actions (Ganti / Hapus) • close */}
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "16px 18px", flex: "0 0 auto" }}>
        <span style={{ ...glass, display: "inline-flex", alignItems: "center", gap: 7, fontFamily: F, fontSize: 12.5, fontWeight: 700, color: "var(--ink-700)", padding: "8px 14px", borderRadius: 999 }}>
          {vid ? <Icons.film size={14} /> : <Icons.image size={14} />}
          {i + 1}<span style={{ opacity: 0.4, fontWeight: 600 }}>/</span>{imgs.length}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {onReplace && (
            <button onClick={() => onReplace(i)} style={pill(false)} onMouseEnter={lift} onMouseLeave={drop} title={t("Ganti {0}", [kind])}>
              <Icons.swap size={16} /><span>{t("Ganti")}</span>
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(i)} style={pill(true)} onMouseEnter={lift} onMouseLeave={drop} title={t("Hapus {0}", [kind])}>
              <Icons.trash size={16} /><span>{t("Hapus")}</span>
            </button>
          )}
          <button onClick={onClose} aria-label={t("Tutup")} style={{ ...glass, width: 42, height: 42, borderRadius: "50%", cursor: "pointer", color: "var(--ink-500)", display: "grid", placeItems: "center", flex: "0 0 auto", transition: "box-shadow .16s, transform .14s" }} onMouseEnter={lift} onMouseLeave={drop}><Icons.x size={20} /></button>
        </div>
      </div>

      {/* stage: arrows flank the media (vertical padding gives breathing room so tall 9:16 media never touches the edges) */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: single ? "14px 16px 40px" : "8px 16px 14px" }}>
        {arrow(-1)}
        <div onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
          onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - (touch.current ?? 0); if (Math.abs(dx) > 44) go(dx < 0 ? 1 : -1); }}
          style={{ flex: "0 1 auto", minWidth: 0, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {vid
            ? <video key={cur?.url} src={cur?.url} controls autoPlay muted loop playsInline style={{ ...mediaStyle, background: "#000" }} />
            : <img key={cur?.url} src={cur?.url} alt="" draggable={false} style={{ ...mediaStyle, background: "#fff", outline: "1px solid rgba(255,255,255,.5)", outlineOffset: -1 }} />}
        </div>
        {arrow(1)}
      </div>

      {/* filmstrip */}
      {!single && (
      <div onClick={(e) => e.stopPropagation()} ref={stripRef} className="sc-scroll"
        style={{ display: "flex", gap: 11, padding: "14px 18px 24px", overflowX: "auto", flex: "0 0 auto", justifyContent: imgs.length > 6 ? "flex-start" : "center" }}>
        {imgs.map((im, k) => {
          const active = k === i;
          const isV = isVideoItem(im);
          const thumbStyle = { width: 52, aspectRatio: thumbAspect, objectFit: "cover", borderRadius: 11, display: "block",
            border: active ? "2.5px solid var(--primary-400)" : "2.5px solid rgba(255,255,255,.9)",
            boxShadow: active ? "0 6px 18px -6px rgba(249,168,38,.6), 0 0 0 3px rgba(249,168,38,.16)" : "0 3px 10px -4px rgba(20,22,30,.4)",
            opacity: active ? 1 : 0.62, transform: active ? "translateY(-3px)" : "none", transition: "opacity .18s, transform .18s, border-color .18s, box-shadow .18s" };
          return (
            <button key={im.storage_path || k} onClick={() => onIndex(k)} aria-label={t("Media {0}", [k + 1])}
              style={{ flex: "0 0 auto", padding: 0, border: "none", cursor: "pointer", background: "transparent", lineHeight: 0, position: "relative" }}
              onMouseEnter={(e) => { if (!active) { e.currentTarget.firstChild.style.opacity = 1; e.currentTarget.firstChild.style.transform = "translateY(-2px)"; } }}
              onMouseLeave={(e) => { if (!active) { e.currentTarget.firstChild.style.opacity = 0.62; e.currentTarget.firstChild.style.transform = "none"; } }}>
              {isV ? <video src={im.url} muted playsInline preload="metadata" style={{ ...thumbStyle, background: "#000" }} /> : <img src={im.url} alt="" draggable={false} style={thumbStyle} />}
              {isV && <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,.6)", pointerEvents: "none" }}><Icons.play size={15} /></span>}
            </button>
          );
        })}
      </div>
      )}
    </div>,
    document.body
  );
}
