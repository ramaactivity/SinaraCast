/* global React, Icons */
const { useState: uS2, useEffect: uE2 } = React;
const F2 = "var(--font)";

/* ---------------- Brand identity helpers ---------------- */
const BRANDS = {
  mahakan:   { id: "mahakan",   name: "Mahakan Coffee",  short: "MC", accent: "var(--b-mahakan)",   soft: "var(--b-mahakan-soft)",   grad: "linear-gradient(135deg,#F6B84A,#EC9A1E)" },
  tiska:     { id: "tiska",     name: "Tiska Catering",  short: "TC", accent: "var(--b-tiska)",     soft: "var(--b-tiska-soft)",     grad: "linear-gradient(135deg,#7BC487,#56A763)" },
  tetra:     { id: "tetra",     name: "Tetra Photobooth",short: "TP", accent: "var(--b-tetra)",     soft: "var(--b-tetra-soft)",     grad: "linear-gradient(135deg,#A78BD6,#8A6BBC)" },
  outentika: { id: "outentika", name: "Outentika",       short: "OT", accent: "var(--b-outentika)", soft: "var(--b-outentika-soft)", grad: "linear-gradient(135deg,#62C4AE,#3FA992)" },
};

function BrandAvatar({ brand, size = 34, ring }) {
  const b = typeof brand === "string" ? BRANDS[brand] : brand;
  return (
    <div style={{
      width: size, height: size, borderRadius: size > 40 ? 13 : 10, flex: "0 0 auto",
      background: b.grad, color: "#fff", display: "grid", placeItems: "center",
      fontFamily: F2, fontWeight: 600, fontSize: size * 0.36, letterSpacing: ".02em",
      boxShadow: ring ? `0 0 0 3px #fff, 0 6px 14px ${b.soft}` : `0 4px 10px rgba(90,96,120,.14)`,
    }}>{b.short}</div>
  );
}

function Avatar({ name = "", size = 38, grad = "var(--primary-grad)" }) {
  const ini = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return <div style={{ width: size, height: size, borderRadius: "50%", flex: "0 0 auto", background: grad,
    color: "#fff", display: "grid", placeItems: "center", fontFamily: F2, fontWeight: 600, fontSize: size * 0.36 }}>{ini}</div>;
}

/* ---------------- Sparkline (mini analytics) ---------------- */
function Sparkline({ data = [], w = 120, h = 38, color = "var(--green-500)", fill = true }) {
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
function Progress({ value = 0, tone = "green", h = 8, showWarn }) {
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
function Chip({ children, tone = "muted", onRemove, icon }) {
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
function MediaThumb({ seed = 0, w = 84, label, invalid, selected, used, onClick, ratio = 16 / 9 }) {
  // deterministic pastel gradient placeholder (no real images)
  const hues = [42, 150, 270, 175, 20, 320];
  const hue = hues[seed % hues.length];
  const numeric = typeof w === "number";
  const sizing = numeric ? { width: w, height: w * ratio } : { width: w, aspectRatio: String(1 / ratio) };
  return (
    <div onClick={onClick} style={{ position: "relative", borderRadius: 12, cursor: onClick ? "pointer" : "default", ...sizing,
      background: `linear-gradient(150deg, hsl(${hue} 70% 88%), hsl(${(hue + 30) % 360} 65% 80%))`,
      border: selected ? "2.5px solid var(--green-500)" : invalid ? "2px solid var(--danger)" : "1px solid var(--line)",
      boxShadow: "var(--shadow-sm)", overflow: "hidden", flex: "0 0 auto" }}>
      <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg, rgba(255,255,255,.18) 0 7px, transparent 7px 14px)" }} />
      {label && <div style={{ position: "absolute", left: 6, bottom: 6, fontFamily: "ui-monospace,monospace", fontSize: 9, color: "rgba(62,67,81,.6)" }}>{label}</div>}
      {invalid && <div style={{ position: "absolute", top: 6, left: 6, width: 20, height: 20, borderRadius: "50%", background: "var(--danger)", color: "#fff", display: "grid", placeItems: "center" }}><Icons.x size={12} sw={2.4} /></div>}
      {used && <div style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,.85)", color: "var(--ink-400)", display: "grid", placeItems: "center" }}><Icons.check size={11} sw={2.4} /></div>}
    </div>
  );
}

/* ---------------- Empty state ---------------- */
function EmptyState({ icon, title, body, action, compact }) {
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
function Skeleton({ w = "100%", h = 16, r = 8, style }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,rgba(140,144,158,.1),rgba(140,144,158,.18),rgba(140,144,158,.1))",
    backgroundSize: "200% 100%", animation: "cosShimmer 1.3s infinite", ...style }} />;
}
function Spinner({ size = 22, color = "var(--green-500)" }) {
  return <div style={{ width: size, height: size, borderRadius: "50%", border: `2.5px solid rgba(140,144,158,.2)`,
    borderTopColor: color, animation: "cosSpin .7s linear infinite" }} />;
}

/* ---------------- Modal + Confirm dialog ---------------- */
function Modal({ open, onClose, children, width = 460 }) {
  uE2(() => {
    if (!open) return;
    const k = e => e.key === "Escape" && onClose && onClose();
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [open]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, display: "grid", placeItems: "center", padding: 24,
      background: "rgba(62,67,81,.32)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", animation: "cosFade .15s" }}>
      <div onClick={e => e.stopPropagation()} style={{ width, maxWidth: "100%", background: "#fff", borderRadius: "var(--r-xl)",
        boxShadow: "var(--shadow-lg)", animation: "cosPop .18s", maxHeight: "88vh", overflow: "auto" }} className="cos-scroll">
        {children}
      </div>
    </div>
  );
}
function ConfirmDialog({ open, onClose, onConfirm, title, body, consequence, confirmLabel = "Delete", danger = true }) {
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
function Toast({ toast }) {
  if (!toast) return null;
  const tones = { success: ["var(--green-500)", <Icons.checkCircle size={19} />], error: ["var(--danger)", <Icons.warn size={19} />], info: ["var(--ink-700)", <Icons.info size={19} />] };
  const [fg, ic] = tones[toast.type] || tones.info;
  return (
    <div style={{ position: "fixed", bottom: 26, left: "50%", transform: "translateX(-50%)", zIndex: 300,
      display: "flex", alignItems: "center", gap: 11, background: "#fff", borderRadius: 14, padding: "13px 20px",
      boxShadow: "var(--shadow-lg)", border: "1px solid var(--line)", animation: "cosToast .25s", fontFamily: F2, fontSize: 13.5, fontWeight: 500, color: "var(--ink-900)" }}>
      <span style={{ color: fg }}>{ic}</span>{toast.msg}
    </div>
  );
}

window.BRANDS = BRANDS; window.BrandAvatar = BrandAvatar; window.Avatar = Avatar;
window.Sparkline = Sparkline; window.Progress = Progress; window.Chip = Chip;
window.MediaThumb = MediaThumb; window.EmptyState = EmptyState; window.Skeleton = Skeleton;
window.Spinner = Spinner; window.Modal = Modal; window.ConfirmDialog = ConfirmDialog; window.Toast = Toast;
