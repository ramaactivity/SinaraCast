"use client";
import React from "react";
import { Icons } from "./icons";
import { useApp } from "./store";
import { BRANDS, BrandAvatar, Avatar } from "./ui";
const { useState: uSh } = React;
const FS = "var(--font)";

const NAV = [
  { id: "rules", label: "Rules", icon: "rules", phase: "P1" },
  { id: "calendar", label: "Calendar", icon: "calendar", phase: "P2" },
  { id: "activity", label: "Activity", icon: "activity", phase: "P1" },
  { id: "connections", label: "Connections", icon: "connections", phase: "P1" },
];

const MenuIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);

export function Sidebar({ mobile, open, onClose }) {
  const app = useApp();
  const [swOpen, setSwOpen] = uSh(false);
  const ch = app.channels.find(c => c.id === app.channel) || app.channels[0];
  const active = BRANDS[ch?.brand] || { name: ch?.name || "—", accent: "var(--ink-500)", soft: "var(--line)" };

  const asideStyle = mobile ? {
    position: "fixed", top: 0, left: 0, height: "100%", width: 280, maxWidth: "85vw",
    display: "flex", flexDirection: "column", padding: "20px 16px",
    background: "rgba(255,255,255,0.95)", backdropFilter: "blur(var(--blur))", WebkitBackdropFilter: "blur(var(--blur))",
    borderRight: "1px solid var(--line)", boxShadow: "var(--shadow-lg)",
    transform: open ? "translateX(0)" : "translateX(-101%)", transition: "transform .26s cubic-bezier(.4,0,.2,1)", zIndex: 70,
  } : {
    width: "var(--side-w)", flex: "0 0 var(--side-w)", display: "flex", flexDirection: "column",
    padding: "24px 18px", background: "var(--sidebar-glass)", backdropFilter: "blur(var(--blur))",
    WebkitBackdropFilter: "blur(var(--blur))", borderRight: "1px solid rgba(255,255,255,.45)",
    borderTopLeftRadius: "var(--r-xl)", borderBottomLeftRadius: "var(--r-xl)",
  };

  return (
    <aside style={asideStyle}>

      {/* logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "0 8px 22px" }}>
        <div style={{ width: 34, height: 34, borderRadius: 11, background: "var(--primary-grad)", boxShadow: "var(--shadow-primary)",
          display: "grid", placeItems: "center", color: "#fff" }}><Icons.grid size={18} sw={2} /></div>
        <span style={{ fontFamily: FS, fontWeight: 600, fontSize: 17, color: "var(--ink-900)" }}>SinaraCast</span>
        {mobile && <button onClick={onClose} aria-label="Tutup menu" style={{ marginLeft: "auto", width: 34, height: 34, borderRadius: 10, border: "none", background: "rgba(140,144,158,.12)", color: "var(--ink-500)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icons.x size={18} /></button>}
      </div>

      {/* channel switcher */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <button onClick={() => setSwOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11,
          padding: "9px 11px", background: "#fff", border: "1px solid var(--line)", borderRadius: 14, cursor: "pointer",
          boxShadow: "var(--shadow-sm)" }}>
          <BrandAvatar brand={active} src={ch?.avatarUrl} size={32} />
          <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
            <div style={{ fontFamily: FS, fontWeight: 600, fontSize: 13, color: "var(--ink-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{active.name}</div>
            <div style={{ fontFamily: FS, fontSize: 10.5, color: "var(--ink-400)" }}>{ch?.handle}</div>
          </div>
          <Icons.chevDown size={16} style={{ color: "var(--ink-400)", transform: swOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </button>
        {swOpen && (
          <>
            <div onClick={() => setSwOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50, background: "#fff",
              borderRadius: 16, boxShadow: "var(--shadow-lg)", border: "1px solid var(--line)", padding: 6, animation: "scPop .15s" }}>
              <div style={{ fontFamily: FS, fontSize: 10, fontWeight: 600, letterSpacing: ".1em", color: "var(--ink-400)", padding: "8px 10px 6px" }}>CHANNELS</div>
              {app.channels.map(c => {
                const b = BRANDS[c.brand] || { name: c.name, accent: "var(--ink-500)", soft: "var(--line)" }, on = c.id === app.channel;
                const dot = c.status === "Connected" ? "var(--st-success)" : c.status === "Expiring" ? "var(--st-publishing)" : "var(--st-failed)";
                return (
                  <button key={c.id} onClick={() => { app.setChannel(c.id); setSwOpen(false); onClose && onClose(); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11,
                    padding: "9px 10px", border: "none", background: on ? "var(--primary-100)" : "transparent", borderRadius: 11, cursor: "pointer", marginBottom: 2 }}>
                    <BrandAvatar brand={b} src={c.avatarUrl} size={30} />
                    <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                      <div style={{ fontFamily: FS, fontWeight: 600, fontSize: 12.5, color: "var(--ink-900)" }}>{b.name}</div>
                      <div style={{ fontFamily: FS, fontSize: 10, color: "var(--ink-400)", display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot }} />{c.status}{c.paused ? " · dijeda" : ""}
                      </div>
                    </div>
                    {on && <Icons.check size={16} style={{ color: "var(--primary-500)" }} />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ fontFamily: FS, fontSize: 10, fontWeight: 600, letterSpacing: ".1em", color: "var(--ink-400)", padding: "0 12px 8px" }}>MENU</div>
        {NAV.map(n => <NavItem key={n.id} n={n} active={app.view === n.id} onClick={() => app.go(n.id)} />)}
      </nav>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* pause-all status */}
        {app.pauseAll && (
          <div style={{ background: "var(--st-paused-bg)", borderRadius: 14, padding: "11px 13px", display: "flex", alignItems: "center", gap: 9 }}>
            <Icons.pause size={16} style={{ color: "var(--st-paused)" }} />
            <div style={{ fontFamily: FS, fontSize: 11.5, color: "var(--st-paused)", fontWeight: 500, lineHeight: 1.3 }}>Semua posting dijeda</div>
          </div>
        )}
        <NavItem n={{ id: "settings", label: "Settings", icon: "settings" }} active={app.view === "settings"} onClick={() => app.go("settings")} />
        {/* account */}
        <button onClick={() => app.go("profile")} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 11px", border: "1px solid var(--line)",
          background: app.view === "profile" ? "#fff" : "rgba(255,255,255,.5)", borderRadius: 14, cursor: "pointer", boxShadow: "var(--shadow-sm)" }}>
          <Avatar name={app.profile.name} size={32} />
          <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
            <div style={{ fontFamily: FS, fontWeight: 600, fontSize: 12.5, color: "var(--ink-900)" }}>{app.profile.name}</div>
            <div style={{ fontFamily: FS, fontSize: 10, color: "var(--ink-400)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.profile.email}</div>
          </div>
        </button>
      </div>
    </aside>
  );
}

function NavItem({ n, active, onClick }) {
  const [h, setH] = uSh(false);
  const Ic = Icons[n.icon];
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: "none", cursor: "pointer",
        borderRadius: 12, position: "relative", textAlign: "left", width: "100%",
        background: active ? "#fff" : h ? "rgba(255,255,255,.5)" : "transparent",
        boxShadow: active ? "var(--shadow-sm)" : "none",
        color: active ? "var(--primary-500)" : "var(--ink-500)",
        fontFamily: FS, fontWeight: active ? 600 : 500, fontSize: 13.5, transition: "background .15s, color .15s" }}>
      <Ic size={19} sw={active ? 2 : 1.7} />
      <span>{n.label}</span>
      {n.phase === "P2" && <span style={{ marginLeft: "auto", fontFamily: FS, fontSize: 9, fontWeight: 600, color: "var(--ink-300)", border: "1px solid var(--line)", borderRadius: 5, padding: "1px 5px" }}>P2</span>}
      {active && n.phase !== "P2" && <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "var(--primary-500)" }} />}
    </button>
  );
}

/* ---------------- Topbar ---------------- */
export function Topbar({ title, sub, right }) {
  const app = useApp();
  const unread = app.notifs.filter(n => !n.read).length;
  const mobile = app.isMobile;

  const bell = (
    <button onClick={() => app.go("notifications")} title="Notifikasi" style={{ position: "relative", width: 46, height: 46, borderRadius: 14, border: "1px solid var(--line)",
      background: "#fff", color: "var(--ink-500)", cursor: "pointer", display: "grid", placeItems: "center", boxShadow: "var(--shadow-sm)", flex: "0 0 auto" }}>
      <Icons.bell size={20} />
      {unread > 0 && <span style={{ position: "absolute", top: -5, right: -5, minWidth: 19, height: 19, padding: "0 5px", borderRadius: 999,
        background: "var(--danger-grad)", color: "#fff", fontFamily: FS, fontWeight: 600, fontSize: 11, display: "grid", placeItems: "center", boxShadow: "0 0 0 2px #fff" }}>{unread}</span>}
    </button>
  );

  if (mobile) {
    return (
      <header style={{ display: "flex", flexDirection: "column", gap: 12, padding: "2px 0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={app.openMenu} aria-label="Menu" style={{ width: 46, height: 46, borderRadius: 14, border: "1px solid var(--line)", background: "#fff", color: "var(--ink-700)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-sm)", flex: "0 0 auto", cursor: "pointer" }}><MenuIcon /></button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FS, fontWeight: 600, fontSize: 20, color: "var(--ink-900)", letterSpacing: "-.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
            {sub && <div style={{ fontFamily: FS, fontSize: 12, color: "var(--ink-400)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
          </div>
          {bell}
        </div>
        {right && <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>{right}</div>}
      </header>
    );
  }

  return (
    <header style={{ display: "flex", alignItems: "center", gap: 16, padding: "4px 2px 22px" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FS, fontWeight: 600, fontSize: 23, color: "var(--ink-900)", letterSpacing: "-.01em" }}>{title}</div>
        {sub && <div style={{ fontFamily: FS, fontSize: 13, color: "var(--ink-400)", marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
      {bell}
    </header>
  );
}
