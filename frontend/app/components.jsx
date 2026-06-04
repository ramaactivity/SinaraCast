/* global React */
const { useState, useRef, useEffect } = React;

/* ============================================================
   Content OS — reusable component library (DS components)
   All built from the Ca Schedule design system tokens.
   ============================================================ */

const F = "var(--font)";

/* ---------------- Glass panel / Card ---------------- */
// Inner panels sit ON the shell's frosted backdrop, so they use an opaque
// frosted white (no nested backdrop-filter, which paints blank in browsers).
function Panel({ children, style, pad = 22, strong, flush, ...p }) {
  return (
    <div {...p} style={{
      background: strong ? "rgba(255,255,255,0.86)" : "rgba(255,255,255,0.62)",
      border: "1px solid var(--glass-border)", borderRadius: "var(--r-lg)",
      boxShadow: "var(--shadow-md)", padding: flush ? 0 : pad, ...style,
    }}>{children}</div>
  );
}

function Card({ children, style, pad = 18, hover, onClick, ...p }) {
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

function SectionTitle({ children, sub, right, style }) {
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
function Button({ children, variant = "primary", size = "md", icon, iconRight, full, disabled, style, ...p }) {
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

function IconButton({ icon, tip, active, tone = "neutral", size = 38, onClick, style, ...p }) {
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
function Status({ s, pulse }) {
  const [fg, bg] = ST[s] || ST.Skipped;
  return (
    <span className="cos-pill" style={{ color: fg, background: bg }}>
      <span className="dot" style={{ background: fg, animation: pulse ? "cosPulse 1.4s infinite" : "none" }} />
      {s}
    </span>
  );
}

/* ---------------- Toggle ---------------- */
function Toggle({ on, onChange, size = "md" }) {
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
function Field({ label, hint, error, children, style }) {
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
function Input({ icon, invalid, style, ...p }) {
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
function Textarea({ invalid, style, ...p }) {
  const [f, setF] = useState(false);
  return <textarea {...p} onFocus={() => setF(true)} onBlur={() => setF(false)}
    style={{ ...inputBase, height: "auto", minHeight: 96, padding: "12px 15px", resize: "vertical", lineHeight: 1.5,
      border: `1px solid ${invalid ? "var(--danger)" : f ? "var(--primary-300)" : "var(--line)"}`,
      boxShadow: f ? "0 0 0 3px rgba(252,192,76,.18)" : "var(--shadow-sm)", ...style }} />;
}
function Select({ options = [], value, onChange, style }) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange && onChange(e.target.value)}
        style={{ ...inputBase, appearance: "none", paddingRight: 38, cursor: "pointer", ...style }}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
      <span style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", color: "var(--ink-400)", pointerEvents: "none" }}>
        <Icons.chevDown size={17} />
      </span>
    </div>
  );
}
function TimeField({ value, onChange, style }) {
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <span style={{ position: "absolute", left: 14, color: "var(--primary-500)", pointerEvents: "none" }}><Icons.clock size={18} /></span>
      <input type="time" value={value} onChange={e => onChange && onChange(e.target.value)}
        style={{ ...inputBase, paddingLeft: 42, ...style }} />
      <span style={{ position: "absolute", right: 14, fontFamily: F, fontSize: 11, fontWeight: 600, color: "var(--ink-400)", pointerEvents: "none" }}>WIB</span>
    </div>
  );
}

/* ---------------- Segmented control / Tabs ---------------- */
function Segmented({ options, value, onChange, full }) {
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

window.Panel = Panel; window.Card = Card; window.SectionTitle = SectionTitle;
window.Button = Button; window.IconButton = IconButton; window.Status = Status;
window.Toggle = Toggle; window.Field = Field; window.Input = Input; window.Textarea = Textarea;
window.Select = Select; window.TimeField = TimeField; window.Segmented = Segmented;
