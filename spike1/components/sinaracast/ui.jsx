"use client";
import React from "react";
import { createPortal } from "react-dom";
import { Icons } from "./icons";
const { useState, useEffect } = React;

/* ============================================================
   SinaraCast — reusable component library (DS components)
   All built from the Ca Schedule design system tokens.
   ============================================================ */

const F = "var(--font)";

/* ---------------- Glass panel / Card ---------------- */
// Inner panels sit ON the shell's frosted backdrop, so they use an opaque
// frosted white (no nested backdrop-filter, which paints blank in browsers).
export function Panel({ children, style, pad = 22, strong, flush, ...p }) {
  return (
    <div {...p} style={{
      background: strong ? "rgba(255,255,255,0.86)" : "rgba(255,255,255,0.62)",
      border: "1px solid var(--glass-border)", borderRadius: "var(--r-lg)",
      boxShadow: "var(--shadow-md)", padding: flush ? 0 : pad, ...style,
    }}>{children}</div>
  );
}

export function Card({ children, style, pad = 18, hover, onClick, ...p }) {
  const [h, setH] = useState(false);
  return (
    <div {...p} onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--r-md)",
        boxShadow: hover && h ? "var(--shadow-md)" : "var(--shadow-sm)",
        padding: pad, cursor: onClick ? "pointer" : "default",
        transform: hover && h ? "translateY(-2px)" : "none", transition: "box-shadow .18s, transform .18s",
        ...style,
      }}>{children}</div>
  );
}

export function SectionTitle({ children, sub, right, style }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, ...style }}>
      <div>
        <div style={{ fontFamily: F, fontWeight: 600, fontSize: 17, color: "var(--ink-900)" }}>{children}</div>
        {sub && <div style={{ fontFamily: F, fontSize: 12.5, color: "var(--ink-400)", marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

/* ---------------- Buttons ---------------- */
export function Button({ children, variant = "primary", size = "md", icon, iconRight, full, disabled, style, ...p }) {
  const [h, setH] = useState(false);
  const sizes = { sm: { h: 36, px: 16, fs: 13 }, md: { h: 44, px: 22, fs: 14 }, lg: { h: 50, px: 28, fs: 15 } };
  const s = sizes[size];
  const variants = {
    primary: { background: "var(--green-grad)", color: "#fff", boxShadow: h ? "var(--shadow-green)" : "0 8px 18px rgba(130,207,126,.3)", border: "none" },
    amber:   { background: "var(--primary-grad)", color: "#fff", boxShadow: h ? "var(--shadow-primary)" : "0 8px 18px rgba(249,168,38,.28)", border: "none" },
    secondary: { background: "#fff", color: "var(--ink-700)", boxShadow: h ? "var(--shadow-md)" : "var(--shadow-sm)", border: "1px solid var(--line)" },
    ghost: { background: h ? "rgba(140,144,158,.1)" : "transparent", color: "var(--ink-700)", border: "1px solid transparent" },
    danger: { background: h ? "var(--danger-bg)" : "#fff", color: "var(--danger)", border: "1px solid var(--danger-bg)", boxShadow: "none" },
  };
  const v = variants[variant];
  return (
    <button {...p} disabled={disabled}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
        height: s.h, padding: `0 ${s.px}px`, width: full ? "100%" : "auto",
        borderRadius: 13, fontFamily: F, fontWeight: 600, fontSize: s.fs, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, transition: "box-shadow .16s, transform .12s, background .16s",
        transform: h && !disabled ? "translateY(-1px)" : "none", whiteSpace: "nowrap", ...v, ...style,
      }}>
      {icon}{children}{iconRight}
    </button>
  );
}

export function IconButton({ icon, tip, active, tone = "neutral", size = 38, onClick, style, ...p }) {
  const [h, setH] = useState(false);
  const tones = {
    neutral: { bg: h || active ? "rgba(140,144,158,.13)" : "transparent", fg: active ? "var(--ink-900)" : "var(--ink-500)" },
    amber: { bg: h ? "var(--primary-100)" : "transparent", fg: "var(--primary-500)" },
    green: { bg: h ? "var(--green-100)" : "transparent", fg: "var(--green-500)" },
    danger: { bg: h ? "var(--danger-bg)" : "transparent", fg: "var(--danger)" },
  };
  const t = tones[tone];
  return (
    <button {...p} onClick={onClick} title={tip}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width: size, height: size, borderRadius: 11, border: "none", cursor: "pointer",
        background: t.bg, color: t.fg, display: "grid", placeItems: "center", transition: "background .15s", flex: "0 0 auto", ...style }}>
      {icon}
    </button>
  );
}

/* ---------------- Status badge ---------------- */
const ST = {
  Published: ["var(--st-success)", "var(--st-success-bg)"],
  Publishing: ["var(--st-publishing)", "var(--st-publishing-bg)"],
  Scheduled: ["var(--st-scheduled)", "var(--st-scheduled-bg)"],
  Failed: ["var(--st-failed)", "var(--st-failed-bg)"],
  Skipped: ["var(--st-skipped)", "var(--st-skipped-bg)"],
  Paused: ["var(--st-paused)", "var(--st-paused-bg)"],
  Connected: ["var(--st-success)", "var(--st-success-bg)"],
  Expiring: ["var(--st-publishing)", "var(--st-publishing-bg)"],
  "Needs reconnect": ["var(--st-failed)", "var(--st-failed-bg)"],
  Active: ["var(--st-success)", "var(--st-success-bg)"],
  Inactive: ["var(--st-skipped)", "var(--st-skipped-bg)"],
  Draft: ["var(--st-scheduled)", "var(--st-scheduled-bg)"],
};
// Indonesian display labels (keys stay English for color/logic lookups).
export const ST_LABEL = {
  Published: "Terbit", Publishing: "Diproses", Scheduled: "Terjadwal", Failed: "Gagal",
  Skipped: "Dilewati", Paused: "Dijeda", Connected: "Tersambung", Expiring: "Segera kedaluwarsa",
  "Needs reconnect": "Perlu disambungkan", Active: "Aktif", Inactive: "Nonaktif", Draft: "Draf",
};
export const statusLabel = (s) => ST_LABEL[s] || s;
export function Status({ s, pulse }) {
  const [fg, bg] = ST[s] || ST.Skipped;
  return (
    <span className="sc-pill" style={{ color: fg, background: bg }}>
      <span className="dot" style={{ background: fg, animation: pulse ? "scPulse 1.4s infinite" : "none" }} />
      {statusLabel(s)}
    </span>
  );
}

/* ---------------- Toggle ---------------- */
export function Toggle({ on, onChange, size = "md" }) {
  const w = size === "sm" ? 38 : 46, h = size === "sm" ? 22 : 26, k = h - 6;
  return (
    <button onClick={() => onChange && onChange(!on)} style={{
      width: w, height: h, borderRadius: 999, border: "none", cursor: "pointer", padding: 0,
      background: on ? "var(--green-grad)" : "#D9DCE3", position: "relative", transition: "background .2s",
      boxShadow: on ? "inset 0 1px 3px rgba(95,190,107,.4)" : "inset 0 1px 3px rgba(0,0,0,.08)", flex: "0 0 auto",
    }}>
      <span style={{ position: "absolute", top: 3, left: on ? w - k - 3 : 3, width: k, height: k, borderRadius: "50%",
        background: "#fff", boxShadow: "0 2px 5px rgba(0,0,0,.18)", transition: "left .2s" }} />
    </button>
  );
}

/* ---------------- Inputs ---------------- */
export function Field({ label, hint, error, children, style }) {
  return (
    <label style={{ display: "block", ...style }}>
      {label && <div style={{ fontFamily: F, fontWeight: 500, fontSize: 12.5, color: "var(--ink-700)", marginBottom: 7 }}>{label}</div>}
      {children}
      {error ? <div style={{ fontFamily: F, fontSize: 11.5, color: "var(--danger)", marginTop: 6 }}>{error}</div>
        : hint ? <div style={{ fontFamily: F, fontSize: 11.5, color: "var(--ink-400)", marginTop: 6 }}>{hint}</div> : null}
    </label>
  );
}
const inputBase = {
  width: "100%", height: 46, padding: "0 15px", borderRadius: 13, fontFamily: F, fontSize: 14,
  color: "var(--ink-900)", background: "#fff", border: "1px solid var(--line)", outline: "none",
  boxShadow: "var(--shadow-sm)", boxSizing: "border-box",
};
export function Input({ icon, invalid, style, ...p }) {
  const [f, setF] = useState(false);
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {icon && <span style={{ position: "absolute", left: 14, color: "var(--ink-400)", pointerEvents: "none" }}>{icon}</span>}
      <input {...p} onFocus={() => setF(true)} onBlur={() => setF(false)}
        style={{ ...inputBase, paddingLeft: icon ? 42 : 15,
          border: `1px solid ${invalid ? "var(--danger)" : f ? "var(--primary-300)" : "var(--line)"}`,
          boxShadow: f ? "0 0 0 3px rgba(252,192,76,.18)" : "var(--shadow-sm)", ...style }} />
    </div>
  );
}
export function Textarea({ invalid, style, ...p }) {
  const [f, setF] = useState(false);
  return <textarea {...p} onFocus={() => setF(true)} onBlur={() => setF(false)}
    style={{ ...inputBase, height: "auto", minHeight: 96, padding: "12px 15px", resize: "vertical", lineHeight: 1.5,
      border: `1px solid ${invalid ? "var(--danger)" : f ? "var(--primary-300)" : "var(--line)"}`,
      boxShadow: f ? "0 0 0 3px rgba(252,192,76,.18)" : "var(--shadow-sm)", ...style }} />;
}
/* ---------------- Floating popover (portal-positioned, never clipped) ----------------
   Anchors to a ref, renders into document.body at fixed coords, flips up when there's
   no room below, clamps to the viewport, and closes on outside-click / Escape / scroll. */
function Floating({ anchorRef, open, onClose, width, estHeight = 280, children }) {
  const [rect, setRect] = useState(null);
  useEffect(() => {
    if (!open) { setRect(null); return; }
    const update = () => { const r = anchorRef.current?.getBoundingClientRect(); if (r) setRect({ top: r.top, bottom: r.bottom, left: r.left, width: r.width }); };
    update();
    const onDoc = (e) => { if (!anchorRef.current?.contains(e.target) && !e.target.closest?.("[data-floating]")) onClose(); };
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);
  if (!open || !rect) return null;
  const vw = window.innerWidth, vh = window.innerHeight, m = 8;
  const w = Math.min(width || rect.width, vw - 16);
  const left = Math.min(Math.max(m, rect.left), vw - w - m);
  const openUp = (vh - rect.bottom) < estHeight && rect.top > (vh - rect.bottom);
  const pos = openUp ? { bottom: vh - rect.top + m } : { top: rect.bottom + m };
  return createPortal(
    <div data-floating style={{ position: "fixed", left, width: w, zIndex: 1000, animation: "scPop .14s", ...pos }}>{children}</div>,
    document.body
  );
}

export function Select({ options = [], value, onChange, style, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  const cur = options.find((o) => (o.value ?? o) === value);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={{
        ...inputBase, display: "flex", alignItems: "center", cursor: "pointer", textAlign: "left", paddingRight: 38,
        borderColor: open ? "var(--primary-500)" : "var(--line)", boxShadow: open ? "0 0 0 3px rgba(255,159,67,.16)" : "var(--shadow-sm)", ...style,
      }}>
        <span style={{ flex: 1, color: cur ? "var(--ink-900)" : "var(--ink-400)" }}>{cur ? (cur.label ?? cur) : (placeholder || "Pilih…")}</span>
        <span style={{ position: "absolute", right: 13, top: "50%", color: "var(--ink-400)", pointerEvents: "none", transition: "transform .15s", transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)` }}><Icons.chevDown size={17} /></span>
      </button>
      <Floating anchorRef={ref} open={open} onClose={() => setOpen(false)} estHeight={Math.min(options.length * 42 + 12, 280)}>
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 13, boxShadow: "var(--shadow-lg)", padding: 5 }}>
          {options.map((o) => {
            const v = o.value ?? o, on = v === value;
            return (
              <button key={v} type="button" onClick={() => { onChange && onChange(v); setOpen(false); }} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", border: "none", cursor: "pointer", borderRadius: 9,
                background: on ? "var(--primary-100)" : "transparent", color: on ? "var(--primary-500)" : "var(--ink-700)",
                fontFamily: F, fontSize: 13.5, fontWeight: on ? 600 : 500, textAlign: "left",
              }}
              onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "var(--line-soft)"; }}
              onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>
                <span style={{ flex: 1 }}>{o.label ?? o}</span>{on && <Icons.check size={15} sw={2.4} />}
              </button>
            );
          })}
        </div>
      </Floating>
    </div>
  );
}
/* ---------------- Time field (custom dual-column picker, no native input) ---------------- */
const pad2 = (n) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function TimeColumn({ items, value, onPick, label }) {
  const ref = React.useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const el = c.querySelector('[data-on="1"]');
    if (el) c.scrollTop = el.offsetTop - c.clientHeight / 2 + el.clientHeight / 2; // scroll the column only, never the page
  }, []);
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <div style={{ textAlign: "center", fontFamily: F, fontSize: 10, fontWeight: 700, letterSpacing: ".08em", color: "var(--ink-400)", textTransform: "uppercase", padding: "8px 0 6px" }}>{label}</div>
      <div ref={ref} className="sc-scroll" style={{ maxHeight: 168, overflowY: "auto", padding: "0 6px 6px", display: "flex", flexDirection: "column", gap: 2, scrollbarWidth: "thin" }}>
        {items.map((n) => {
          const on = n === value;
          return (
            <button key={n} data-on={on ? "1" : "0"} onClick={() => onPick(n)} style={{
              flex: "0 0 auto", height: 34, border: "none", borderRadius: 9, cursor: "pointer",
              fontFamily: F, fontSize: 14, fontWeight: on ? 700 : 500, fontVariantNumeric: "tabular-nums",
              background: on ? "var(--primary-500)" : "transparent", color: on ? "#fff" : "var(--ink-700)",
              transition: "background .12s",
            }}
            onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "var(--line-soft)"; }}
            onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>
              {pad2(n)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TimeField({ value, onChange, style }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  const [hh, mm] = (value || "00:00").split(":").map((x) => parseInt(x, 10) || 0);
  const set = (h, m) => onChange && onChange(`${pad2(h)}:${pad2(m)}`);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={{
        ...inputBase, paddingLeft: 42, paddingRight: 14, display: "flex", alignItems: "center", cursor: "pointer",
        textAlign: "left", borderColor: open ? "var(--primary-500)" : "var(--line)",
        boxShadow: open ? "0 0 0 3px rgba(255,159,67,.16)" : "var(--shadow-sm)", ...style,
      }}>
        <span style={{ position: "absolute", left: 14, color: "var(--primary-500)", display: "flex" }}><Icons.clock size={18} /></span>
        <span style={{ flex: 1, fontVariantNumeric: "tabular-nums" }}>{pad2(hh)}.{pad2(mm)}</span>
        <span style={{ fontFamily: F, fontSize: 11, fontWeight: 600, color: "var(--ink-400)" }}>WIB</span>
      </button>
      <Floating anchorRef={ref} open={open} onClose={() => setOpen(false)} width={Math.max(232, 0)} estHeight={300}>
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: "1px solid var(--line-soft)" }}>
            <TimeColumn items={HOURS} value={hh} label="Jam" onPick={(h) => set(h, mm)} />
            <div style={{ width: 1, background: "var(--line-soft)", margin: "8px 0" }} />
            <TimeColumn items={MINUTES} value={mm} label="Menit" onPick={(m) => set(hh, m)} />
          </div>
          <div style={{ display: "flex", gap: 8, padding: 8 }}>
            <button type="button" onClick={() => { const n = new Date(Date.now() + 7 * 3600 * 1000); set(n.getUTCHours(), n.getUTCMinutes()); }}
              style={{ flex: 1, height: 34, borderRadius: 9, border: "1px solid var(--line)", background: "#fff", cursor: "pointer", fontFamily: F, fontSize: 12, fontWeight: 600, color: "var(--ink-600)" }}>Sekarang</button>
            <button type="button" onClick={() => setOpen(false)}
              style={{ flex: 1, height: 34, borderRadius: 9, border: "none", background: "var(--primary-500)", cursor: "pointer", fontFamily: F, fontSize: 12, fontWeight: 700, color: "#fff" }}>Selesai</button>
          </div>
        </div>
      </Floating>
    </div>
  );
}

/* ---------------- Segmented control / Tabs ---------------- */
export function Segmented({ options, value, onChange, full }) {
  return (
    <div style={{ display: "inline-flex", background: "rgba(140,144,158,.1)", borderRadius: 12, padding: 4, gap: 3, width: full ? "100%" : "auto" }}>
      {options.map(o => {
        const v = o.value ?? o, on = v === value;
        return (
          <button key={v} onClick={() => onChange(v)} style={{
            flex: full ? 1 : "0 0 auto", border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 9,
            fontFamily: F, fontWeight: on ? 600 : 500, fontSize: 13,
            background: on ? "#fff" : "transparent", color: on ? "var(--ink-900)" : "var(--ink-500)",
            boxShadow: on ? "var(--shadow-sm)" : "none", transition: "all .15s", whiteSpace: "nowrap",
          }}>{o.label ?? o}</button>
        );
      })}
    </div>
  );
}

/* ============================================================
   Brand identity + extra primitives (from components2)
   ============================================================ */
const F2 = "var(--font)";

export const BRANDS = {
  mahakan:   { id: "mahakan",   name: "Mahakan Coffee",  short: "MC", accent: "var(--b-mahakan)",   soft: "var(--b-mahakan-soft)",   grad: "linear-gradient(135deg,#F6B84A,#EC9A1E)" },
  tiska:     { id: "tiska",     name: "Tiska Catering",  short: "TC", accent: "var(--b-tiska)",     soft: "var(--b-tiska-soft)",     grad: "linear-gradient(135deg,#7BC487,#56A763)" },
  tetra:     { id: "tetra",     name: "Tetra Photobooth",short: "TP", accent: "var(--b-tetra)",     soft: "var(--b-tetra-soft)",     grad: "linear-gradient(135deg,#A78BD6,#8A6BBC)" },
  outentika: { id: "outentika", name: "Outentika",       short: "OT", accent: "var(--b-outentika)", soft: "var(--b-outentika-soft)", grad: "linear-gradient(135deg,#62C4AE,#3FA992)" },
};

export function BrandAvatar({ brand, size = 34, ring, src }) {
  const b = typeof brand === "string" ? BRANDS[brand] : brand;
  const [failed, setFailed] = useState(false);
  const radius = size > 40 ? 13 : 10;
  const shadow = ring ? `0 0 0 3px #fff, 0 6px 14px ${b?.soft || "var(--line)"}` : `0 4px 10px rgba(90,96,120,.14)`;
  // Real Instagram profile photo when available; fall back to initials if it
  // fails to load (IG CDN URLs can expire).
  if (src && !failed) return (
    <img src={src} alt={b?.name || ""} referrerPolicy="no-referrer" onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: radius, flex: "0 0 auto", objectFit: "cover", boxShadow: shadow, background: "var(--line)", display: "block" }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flex: "0 0 auto",
      background: b.grad, color: "#fff", display: "grid", placeItems: "center",
      fontFamily: F2, fontWeight: 600, fontSize: size * 0.36, letterSpacing: ".02em",
      boxShadow: shadow,
    }}>{b.short}</div>
  );
}

export function Avatar({ name = "", size = 38, grad = "var(--primary-grad)" }) {
  const ini = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return <div style={{ width: size, height: size, borderRadius: "50%", flex: "0 0 auto", background: grad,
    color: "#fff", display: "grid", placeItems: "center", fontFamily: F2, fontWeight: 600, fontSize: size * 0.36 }}>{ini}</div>;
}

/* ---------------- Sparkline (mini analytics) ---------------- */
export function Sparkline({ data = [], w = 120, h = 38, color = "var(--green-500)", fill = true }) {
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const rng = max - min || 1;
  const pts = data.map((d, i) => [ (i / (data.length - 1)) * w, h - 4 - ((d - min) / rng) * (h - 8) ]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      {fill && <path d={area} fill={color} opacity="0.12" />}
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.length > 0 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} />}
    </svg>
  );
}

/* ---------------- Progress bar (storage / upload) ---------------- */
export function Progress({ value = 0, tone = "green", h = 8, showWarn }) {
  const warn = value >= 80;
  const grad = warn ? "var(--primary-grad)" : tone === "amber" ? "var(--primary-grad)" : "var(--green-grad)";
  return (
    <div style={{ width: "100%", height: h, borderRadius: 999, background: "rgba(140,144,158,.16)", overflow: "hidden" }}>
      <div style={{ width: `${Math.min(value, 100)}%`, height: "100%", borderRadius: 999,
        background: (showWarn && warn) ? "var(--danger-grad)" : grad, transition: "width .4s" }} />
    </div>
  );
}

/* ---------------- Tag chip ---------------- */
export function Chip({ children, tone = "muted", onRemove, icon }) {
  const tones = {
    muted: ["rgba(140,144,158,.13)", "var(--ink-500)"],
    amber: ["var(--primary-100)", "#E0922A"], green: ["var(--green-100)", "var(--green-500)"],
    lilac: ["var(--card-lilac)", "#9579C4"],
  };
  const [bg, fg] = tones[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: bg, color: fg,
      fontFamily: F2, fontWeight: 500, fontSize: 11.5, padding: "5px 10px", borderRadius: 999 }}>
      {icon}{children}
      {onRemove && <span onClick={onRemove} style={{ cursor: "pointer", display: "grid", placeItems: "center", opacity: .7 }}><Icons.x size={12} /></span>}
    </span>
  );
}

/* ---------------- Media thumbnail (9:16 story) ---------------- */
export function MediaThumb({ seed = 0, w = 84, label, invalid, selected, used, onClick, ratio = 16 / 9, src }) {
  // deterministic pastel gradient placeholder; if `src` is given, show the real image
  const hues = [42, 150, 270, 175, 20, 320];
  const hue = hues[seed % hues.length];
  const numeric = typeof w === "number";
  const sizing = numeric ? { width: w, height: w * ratio } : { width: w, aspectRatio: String(1 / ratio) };
  return (
    <div onClick={onClick} style={{ position: "relative", borderRadius: 12, cursor: onClick ? "pointer" : "default", ...sizing,
      background: `linear-gradient(150deg, hsl(${hue} 70% 88%), hsl(${(hue + 30) % 360} 65% 80%))`,
      border: selected ? "2.5px solid var(--green-500)" : invalid ? "2px solid var(--danger)" : "1px solid var(--line)",
      boxShadow: "var(--shadow-sm)", overflow: "hidden", flex: "0 0 auto" }}>
      {src
        ? <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg, rgba(255,255,255,.18) 0 7px, transparent 7px 14px)" }} />}
      {label && <div style={{ position: "absolute", left: 6, bottom: 6, fontFamily: "ui-monospace,monospace", fontSize: 9, color: "rgba(62,67,81,.6)" }}>{label}</div>}
      {invalid && <div style={{ position: "absolute", top: 6, left: 6, width: 20, height: 20, borderRadius: "50%", background: "var(--danger)", color: "#fff", display: "grid", placeItems: "center" }}><Icons.x size={12} sw={2.4} /></div>}
      {used && <div style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,.85)", color: "var(--ink-400)", display: "grid", placeItems: "center" }}><Icons.check size={11} sw={2.4} /></div>}
    </div>
  );
}

/* ---------------- Empty state ---------------- */
export function EmptyState({ icon, title, body, action, compact }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
      padding: compact ? "30px 24px" : "54px 24px", gap: 6 }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: "var(--primary-100)", color: "var(--primary-500)",
        display: "grid", placeItems: "center", marginBottom: 8 }}>{icon || <Icons.layers size={28} />}</div>
      <div style={{ fontFamily: F2, fontWeight: 600, fontSize: 16, color: "var(--ink-900)" }}>{title}</div>
      {body && <div style={{ fontFamily: F2, fontSize: 13, color: "var(--ink-400)", maxWidth: 320, lineHeight: 1.5 }}>{body}</div>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

/* ---------------- Loading (skeleton + spinner) ---------------- */
export function Skeleton({ w = "100%", h = 16, r = 8, style }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,rgba(140,144,158,.1),rgba(140,144,158,.18),rgba(140,144,158,.1))",
    backgroundSize: "200% 100%", animation: "scShimmer 1.3s infinite", ...style }} />;
}
export function Spinner({ size = 22, color = "var(--green-500)" }) {
  return <div style={{ width: size, height: size, borderRadius: "50%", border: `2.5px solid rgba(140,144,158,.2)`,
    borderTopColor: color, animation: "scSpin .7s linear infinite" }} />;
}

/* ---------------- Modal + Confirm dialog ---------------- */
export function Modal({ open, onClose, children, width = 460 }) {
  useEffect(() => {
    if (!open) return;
    const k = e => e.key === "Escape" && onClose && onClose();
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [open]);
  if (!open || typeof document === "undefined") return null;
  // Portal to body so the scrim covers the whole viewport (escapes the app-shell's
  // backdrop-filter/overflow clip) — seamless, no boxy edge.
  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, display: "grid", placeItems: "center", padding: 24,
      background: "rgba(62,67,81,.32)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", animation: "scFade .15s" }}>
      <div onClick={e => e.stopPropagation()} style={{ width, maxWidth: "100%", background: "#fff", borderRadius: "var(--r-xl)",
        boxShadow: "var(--shadow-lg)", animation: "scPop .18s", maxHeight: "88vh", overflow: "auto" }} className="sc-scroll">
        {children}
      </div>
    </div>,
    document.body
  );
}
export function ConfirmDialog({ open, onClose, onConfirm, title, body, consequence, confirmLabel = "Delete", danger = true }) {
  return (
    <Modal open={open} onClose={onClose} width={440}>
      <div style={{ padding: 26 }}>
        <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, flex: "0 0 auto", display: "grid", placeItems: "center",
            background: danger ? "var(--danger-bg)" : "var(--primary-100)", color: danger ? "var(--danger)" : "var(--primary-500)" }}>
            <Icons.alert size={22} />
          </div>
          <div>
            <div style={{ fontFamily: F2, fontWeight: 600, fontSize: 17, color: "var(--ink-900)" }}>{title}</div>
            {body && <div style={{ fontFamily: F2, fontSize: 13.5, color: "var(--ink-500)", marginTop: 4, lineHeight: 1.55 }}>{body}</div>}
          </div>
        </div>
        {consequence && (
          <div style={{ background: danger ? "var(--danger-bg)" : "var(--primary-100)", borderRadius: 12, padding: "12px 14px",
            fontFamily: F2, fontSize: 12.5, color: danger ? "var(--danger)" : "#B07B22", lineHeight: 1.5, marginBottom: 18 }}>{consequence}</div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: consequence ? 0 : 18 }}>
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button variant={danger ? "danger" : "amber"} onClick={onConfirm} icon={danger ? <Icons.trash size={17} /> : null}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- Toast ---------------- */
export function Toast({ toast }) {
  if (!toast) return null;
  const tones = { success: ["var(--green-500)", <Icons.checkCircle size={19} />], error: ["var(--danger)", <Icons.warn size={19} />], info: ["var(--ink-700)", <Icons.info size={19} />] };
  const [fg, ic] = tones[toast.type] || tones.info;
  return (
    <div style={{ position: "fixed", bottom: 26, left: "50%", transform: "translateX(-50%)", zIndex: 300,
      display: "flex", alignItems: "center", gap: 11, background: "#fff", borderRadius: 14, padding: "13px 20px",
      boxShadow: "var(--shadow-lg)", border: "1px solid var(--line)", animation: "scToast .25s", fontFamily: F2, fontSize: 13.5, fontWeight: 500, color: "var(--ink-900)" }}>
      <span style={{ color: fg }}>{ic}</span>{toast.msg}
    </div>
  );
}

/* ---------------- Banner (shared by Rules + Editor) ---------------- */
export function Banner({ tone, icon, title, body, action }) {
  const map = { error: ["var(--danger-bg)", "var(--danger)"], paused: ["var(--st-paused-bg)", "var(--st-paused)"], warn: ["var(--st-publishing-bg)", "var(--st-publishing)"] };
  const [bg, fg] = map[tone];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 13, background: bg, borderRadius: 16, padding: "13px 16px", marginBottom: 16 }}>
      <span style={{ color: fg }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: F, fontWeight: 600, fontSize: 13.5, color: fg }}>{title}</div>
        <div style={{ fontFamily: F, fontSize: 12.5, color: "var(--ink-600)", marginTop: 1 }}>{body}</div>
      </div>
      {action}
    </div>
  );
}
