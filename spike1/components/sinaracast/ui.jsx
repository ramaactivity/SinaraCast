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
  const maxW = Math.min(vw - 2 * m, 360);
  // fixed width when given (Time/Date pickers have fixed internal layouts); otherwise
  // size to content (Select) between the anchor width and maxW so long options never wrap.
  const fixed = width != null;
  const reserve = fixed ? Math.min(width, maxW) : maxW; // width to reserve when clamping
  let left = rect.left;
  if (left + reserve > vw - m) left = rect.left + rect.width - reserve; // open leftward, tuck under the field
  left = Math.max(m, Math.min(left, vw - m - reserve));
  const openUp = (vh - rect.bottom) < estHeight && rect.top > (vh - rect.bottom);
  const pos = openUp ? { bottom: vh - rect.top + m } : { top: rect.bottom + m };
  const sizing = fixed
    ? { width: Math.min(width, maxW) }
    : { minWidth: Math.min(rect.width, maxW), maxWidth: maxW, width: "max-content" };
  return createPortal(
    <div data-floating style={{ position: "fixed", left, ...sizing, zIndex: 1000, animation: "scPop .14s", ...pos }}>{children}</div>,
    document.body
  );
}

export function Select({ options = [], value, onChange, style, placeholder, size = "md" }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  const cur = options.find((o) => (o.value ?? o) === value);
  const sm = size === "sm";
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={{
        ...inputBase, ...(sm ? { height: 40, fontSize: 13, paddingLeft: 13, borderRadius: 11 } : {}),
        display: "flex", alignItems: "center", cursor: "pointer", textAlign: "left", paddingRight: sm ? 34 : 38,
        borderColor: open ? "var(--primary-500)" : "var(--line)", boxShadow: open ? "0 0 0 3px rgba(255,159,67,.16)" : "var(--shadow-sm)", ...style,
      }}>
        <span style={{ flex: 1, minWidth: 0, color: cur ? "var(--ink-900)" : "var(--ink-400)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cur ? (cur.label ?? cur) : (placeholder || "Pilih…")}</span>
        <span style={{ position: "absolute", right: sm ? 11 : 13, top: "50%", color: open ? "var(--primary-500)" : "var(--ink-400)", pointerEvents: "none", display: "flex", transition: "transform .2s cubic-bezier(.2,.8,.2,1), color .15s", transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)` }}><Icons.chevDown size={sm ? 15 : 16} /></span>
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
                <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.label ?? o}</span>{on && <Icons.check size={15} sw={2.4} style={{ flex: "0 0 auto" }} />}
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

/* ---------------- Date field (custom calendar, no native picker) ---------------- */
const MON_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONFULL_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const DOW_ID = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const ymd = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
const fmtDateID = (s) => { if (!s) return ""; const [y, m, d] = s.split("-").map(Number); return `${d} ${MON_ID[m - 1]} ${y}`; };
const todayID = () => { const d = new Date(Date.now() + 7 * 3600 * 1000); return ymd(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };

export function DateField({ value, onChange, min, style }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  const today = todayID();
  const baseStr = value || today;
  const [vm, setVm] = useState(() => { const [y, m] = baseStr.split("-").map(Number); return { y, m: m - 1 }; });
  const openIt = () => { const [y, m] = (value || today).split("-").map(Number); setVm({ y, m: m - 1 }); setOpen(true); };
  const days = new Date(Date.UTC(vm.y, vm.m + 1, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(vm.y, vm.m, 1)).getUTCDay() + 6) % 7;
  const cells = []; for (let i = 0; i < lead; i++) cells.push(null); for (let d = 1; d <= days; d++) cells.push(d);
  const shift = (n) => setVm((s) => { const dt = new Date(Date.UTC(s.y, s.m + n, 1)); return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() }; });
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => (open ? setOpen(false) : openIt())} style={{
        ...inputBase, paddingLeft: 42, paddingRight: 14, display: "flex", alignItems: "center", cursor: "pointer", textAlign: "left",
        borderColor: open ? "var(--primary-500)" : "var(--line)", boxShadow: open ? "0 0 0 3px rgba(255,159,67,.16)" : "var(--shadow-sm)", ...style,
      }}>
        <span style={{ position: "absolute", left: 14, color: "var(--primary-500)", display: "flex" }}><Icons.calendar size={18} /></span>
        <span style={{ flex: 1, color: value ? "var(--ink-900)" : "var(--ink-400)" }}>{value ? fmtDateID(value) : "Pilih tanggal"}</span>
      </button>
      <Floating anchorRef={ref} open={open} onClose={() => setOpen(false)} width={290} estHeight={320}>
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow-lg)", padding: 12, width: 290 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <button type="button" onClick={() => shift(-1)} style={navBtn}><Icons.chevLeft size={17} /></button>
            <span style={{ fontFamily: F, fontWeight: 700, fontSize: 13.5, color: "var(--ink-900)" }}>{MONFULL_ID[vm.m]} {vm.y}</span>
            <button type="button" onClick={() => shift(1)} style={navBtn}><Icons.chevRight size={17} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
            {DOW_ID.map((d) => <div key={d} style={{ textAlign: "center", fontFamily: F, fontSize: 10, fontWeight: 700, color: "var(--ink-300)", padding: "2px 0 6px" }}>{d}</div>)}
            {cells.map((d, i) => {
              if (d == null) return <div key={"e" + i} />;
              const s = ymd(vm.y, vm.m, d);
              const on = s === value, isToday = s === today, disabled = min && s < min;
              return (
                <button key={d} type="button" disabled={disabled} onClick={() => { onChange && onChange(s); setOpen(false); }}
                  style={{ height: 34, borderRadius: 9, border: "none", cursor: disabled ? "not-allowed" : "pointer", fontFamily: F, fontSize: 13,
                    fontWeight: on ? 700 : 500, fontVariantNumeric: "tabular-nums", opacity: disabled ? 0.32 : 1,
                    background: on ? "var(--primary-500)" : "transparent", color: on ? "#fff" : isToday ? "var(--primary-600,#b8338a)" : "var(--ink-700)",
                    boxShadow: isToday && !on ? "inset 0 0 0 1.5px var(--primary-200)" : "none", transition: "background .12s" }}
                  onMouseEnter={(e) => { if (!on && !disabled) e.currentTarget.style.background = "var(--line-soft)"; }}
                  onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>{d}</button>
              );
            })}
          </div>
        </div>
      </Floating>
    </div>
  );
}
const navBtn = { width: 30, height: 30, borderRadius: 9, border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-500)", display: "grid", placeItems: "center" };

/* ---------------- Checkbox (custom) ---------------- */
export function Checkbox({ checked, onChange, disabled, size = 18 }) {
  return (
    <button type="button" role="checkbox" aria-checked={!!checked} disabled={disabled}
      onClick={(e) => { e.stopPropagation(); if (!disabled && onChange) onChange(!checked); }}
      style={{ width: size, height: size, flex: "0 0 auto", borderRadius: 6, padding: 0, cursor: disabled ? "not-allowed" : "pointer",
        border: `1.5px solid ${checked ? "var(--primary-500)" : "var(--line)"}`, background: checked ? "var(--primary-grad)" : "#fff",
        color: "#fff", display: "grid", placeItems: "center", boxShadow: checked ? "var(--shadow-primary)" : "var(--shadow-sm)", transition: "background .15s, border-color .15s" }}>
      {checked && <Icons.check size={size - 6} sw={3} />}
    </button>
  );
}

/* ---------------- Slider (custom range, pointer-drag) ---------------- */
export function Slider({ value, onChange, onCommit, min = 0, max = 100, step = 1, tone = "green", style }) {
  const ref = React.useRef(null);
  const last = React.useRef(value);
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const grad = tone === "amber" ? "var(--primary-grad)" : "var(--green-grad)";
  const accent = tone === "amber" ? "var(--primary-500)" : "var(--green-500)";
  const setFrom = (clientX) => {
    const r = ref.current?.getBoundingClientRect(); if (!r) return;
    let p = (clientX - r.left) / r.width; p = Math.max(0, Math.min(1, p));
    let v = Math.max(min, Math.min(max, Math.round((min + p * (max - min)) / step) * step));
    last.current = v; onChange && onChange(v);
  };
  const onDown = (e) => {
    e.preventDefault(); setFrom(e.clientX);
    const move = (ev) => setFrom(ev.clientX);
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); onCommit && onCommit(last.current); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  return (
    <div ref={ref} onPointerDown={onDown} style={{ position: "relative", height: 26, display: "flex", alignItems: "center", cursor: "pointer", touchAction: "none", ...style }}>
      <div style={{ position: "absolute", left: 0, right: 0, height: 7, borderRadius: 999, background: "rgba(140,144,158,.18)" }} />
      <div style={{ position: "absolute", left: 0, width: `${pct}%`, height: 7, borderRadius: 999, background: grad }} />
      <div style={{ position: "absolute", left: `${pct}%`, transform: "translateX(-50%)", width: 18, height: 18, borderRadius: "50%", background: "#fff", border: `2px solid ${accent}`, boxShadow: "var(--shadow-sm)" }} />
    </div>
  );
}

/* ---------------- Number stepper (custom, no native spinner) ---------------- */
export function NumberField({ value, onChange, min = 0, max = 9999, step = 1, suffix, style }) {
  const clamp = (v) => Math.max(min, Math.min(max, v));
  const btn = (disabled) => ({ width: 40, height: 44, flex: "0 0 auto", borderRadius: 11, border: "1px solid var(--line)", background: "#fff", cursor: disabled ? "not-allowed" : "pointer", color: disabled ? "var(--ink-300)" : "var(--ink-700)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-sm)" });
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, ...style }}>
      <button type="button" disabled={value <= min} onClick={() => onChange(clamp(value - step))} style={btn(value <= min)}><span style={{ fontSize: 20, fontWeight: 600, lineHeight: 1, marginTop: -2 }}>−</span></button>
      <div style={{ minWidth: 58, height: 44, borderRadius: 12, border: "1px solid var(--line)", background: "#fff", boxShadow: "var(--shadow-sm)", display: "grid", placeItems: "center", fontFamily: F, fontSize: 15, fontWeight: 600, color: "var(--ink-900)", fontVariantNumeric: "tabular-nums", padding: "0 12px" }}>{value}{suffix ? <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-400)", marginLeft: 3 }}>{suffix}</span> : null}</div>
      <button type="button" disabled={value >= max} onClick={() => onChange(clamp(value + step))} style={btn(value >= max)}><span style={{ fontSize: 20, fontWeight: 600, lineHeight: 1, marginTop: -2 }}>+</span></button>
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

/* ---------------- Platform glyph (shared) ---------------- */
// Canonical per-platform brand colors (single source for the whole app).
export const PLATFORM_COLOR = {
  instagram: "#C2387E", tiktok: "#3B3B3F", youtube: "#E0322B", linkedin: "#1467B0",
  twitter: "#3A3A3C", threads: "#5A5A5E", facebook: "#1877F2",
};
export function PlatIcon({ p, size = 16, color }) {
  const c = color || PLATFORM_COLOR[p] || "var(--ink-400)";
  const base = { width: size, height: size, viewBox: "0 0 24 24", style: { flex: "0 0 auto", display: "block" } };
  switch (p) {
    case "instagram": return <svg {...base} fill="none" stroke={c} strokeWidth="2"><rect x="2.5" y="2.5" width="19" height="19" rx="5.5" /><circle cx="12" cy="12" r="4.3" /><circle cx="17.4" cy="6.6" r="1.15" fill={c} stroke="none" /></svg>;
    case "tiktok": return <svg {...base} fill={c}><path d="M16.5 3c.3 2 1.5 3.4 3.5 3.6V9c-1.3 0-2.5-.4-3.5-1.1V15a5.5 5.5 0 1 1-5.5-5.5c.3 0 .6 0 .9.1v2.6a2.9 2.9 0 1 0 2 2.8V3h2.6z" /></svg>;
    case "youtube": return <svg {...base} fill={c}><path d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.9 4.8 12 4.8 12 4.8s-5.9 0-7.6.4a2.8 2.8 0 0 0-2 2C2 8.9 2 12 2 12s0 3.1.4 4.8a2.8 2.8 0 0 0 2 2c1.7.4 7.6.4 7.6.4s5.9 0 7.6-.4a2.8 2.8 0 0 0 2-2c.4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8zM10 15V9l5 3-5 3z" /></svg>;
    case "linkedin": return <svg {...base} fill={c}><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-5.3c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8V21H9z" /></svg>;
    case "twitter": return <svg {...base} fill={c}><path d="M18.2 2H21l-6.5 7.4L22 22h-6.8l-4.3-5.6L5.9 22H3l7-8L2.3 2H9l3.9 5.2L18.2 2zm-1.2 18h1.5L7.1 3.9H5.5L17 20z" /></svg>;
    case "facebook": return <svg {...base} fill={c}><path d="M14 9V7c0-.9.6-1 1-1h2V3h-3c-2.5 0-4 1.5-4 4v2H8v3h2v9h4v-9h2.5l.5-3h-3z" /></svg>;
    case "threads": return <svg {...base} fill={c}><path d="M12.2 22C7 22 3.5 18.4 3.5 12.1S7 2 12.1 2c3.7 0 6.4 1.7 7.7 4.7l-1.8.8C17 5.3 15 4 12.1 4 8.1 4 5.5 6.7 5.5 12.1S8.1 20 12.1 20c2.6 0 4.2-.9 5.5-2.8 1-1.4 1.1-3.3.4-4.6-.5-1-1.4-1.7-2.6-2 .1 1.9-.7 3.9-3.1 4-1.7.1-3.2-1-3.3-2.6-.1-1.7 1.3-2.8 3.3-2.8.9 0 1.7.1 2.4.4-.2-1.1-.9-1.8-2.3-1.8-1 0-1.7.3-2.2 1l-1.6-1.1c.9-1.3 2.2-1.9 3.9-1.9 2.8 0 4.3 1.8 4.4 4.3.7.4 1.3 1 1.7 1.7 1 1.9.9 4.7-.6 6.7C17.4 20.8 15.3 22 12.2 22z" /></svg>;
    default: return <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: "inline-block", flex: "0 0 auto" }} />;
  }
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
        ? (/\.(mp4|mov)(\?|$)/i.test(src)
            ? <video src={src} muted playsInline preload="metadata" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: "#000" }} />
            : <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />)
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

// Single-button notice card — the in-app replacement for window.alert(). Wired to
// app.alert(): pass a string, or { title, body, tone, confirmLabel }. tone tints the
// icon chip (info | success | warn | danger). Body preserves line breaks.
export function AlertDialog({ open, onClose, title, body, tone = "info", confirmLabel = "Mengerti" }) {
  const tones = {
    info: ["var(--ink-700)", "rgba(140,144,158,.14)", <Icons.info size={22} />],
    success: ["var(--green-500)", "var(--green-100)", <Icons.checkCircle size={22} />],
    warn: ["#B07B22", "var(--primary-100)", <Icons.alert size={22} />],
    danger: ["var(--danger)", "var(--danger-bg)", <Icons.warn size={22} />],
  };
  const [fg, chipBg, ic] = tones[tone] || tones.info;
  return (
    <Modal open={open} onClose={onClose} width={420}>
      <div style={{ padding: 26 }}>
        <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, flex: "0 0 auto", display: "grid", placeItems: "center", background: chipBg, color: fg }}>{ic}</div>
          <div style={{ minWidth: 0, alignSelf: "center" }}>
            {title && <div style={{ fontFamily: F2, fontWeight: 600, fontSize: 17, color: "var(--ink-900)" }}>{title}</div>}
            {body && <div style={{ fontFamily: F2, fontSize: 13.5, color: "var(--ink-500)", marginTop: title ? 4 : 0, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{body}</div>}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="amber" onClick={onClose}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- Toast ---------------- */
// Bottom-right, auto-dismissed by the store; click to dismiss early. Icon sits in a
// tinted chip so the tone reads at a glance without a colored side-stripe.
export function Toast({ toast, onClose }) {
  if (!toast) return null;
  const tones = {
    success: ["var(--green-500)", "var(--green-100)", <Icons.checkCircle size={18} />],
    error: ["var(--danger)", "var(--danger-bg)", <Icons.warn size={18} />],
    info: ["var(--ink-700)", "rgba(140,144,158,.14)", <Icons.info size={18} />],
  };
  const [fg, chipBg, ic] = tones[toast.type] || tones.info;
  return (
    <div onClick={onClose} role="status" aria-live="polite" title="Tutup"
      style={{ position: "fixed", bottom: 22, right: 22, left: "auto", zIndex: 300, maxWidth: "min(380px, calc(100vw - 44px))",
        display: "flex", alignItems: "center", gap: 12, background: "#fff", borderRadius: 14, padding: "11px 15px 11px 11px",
        boxShadow: "var(--shadow-lg)", border: "1px solid var(--line)", animation: "scToast .26s cubic-bezier(.2,.85,.25,1)",
        cursor: "pointer", fontFamily: F2, fontSize: 13.5, fontWeight: 500, color: "var(--ink-900)" }}>
      <span style={{ width: 30, height: 30, borderRadius: 10, flex: "0 0 auto", display: "grid", placeItems: "center", background: chipBg, color: fg }}>{ic}</span>
      <span style={{ lineHeight: 1.4 }}>{toast.msg}</span>
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
