"use client";
import React from "react";
import { Icons } from "./icons";
import { useApp } from "./store";
import { BrandAvatar, Avatar, PlatIcon } from "./ui";
const { useState: uSh } = React;
const FS = "var(--font)";

// platform label + accent (small local copy to avoid a circular import with views)
const PLAT = {
  instagram: { l: "Instagram", c: "#C2387E" }, tiktok: { l: "TikTok", c: "#3B3B3F" },
  youtube: { l: "YouTube", c: "#E0322B" }, linkedin: { l: "LinkedIn", c: "#1467B0" },
  twitter: { l: "X", c: "#3A3A3C" }, threads: { l: "Threads", c: "#5A5A5E" }, facebook: { l: "Facebook", c: "#1877F2" },
};
const brandAv = (name) => ({ name: name || "—", short: (name || "?").slice(0, 2).toUpperCase(), grad: "var(--primary-grad)" });

const NAV = [
  { id: "rules", label: "Jadwal Otomatis", icon: "rules" },
  { id: "composer", label: "Buat Postingan", icon: "plus" },
  { id: "planner", label: "Rencana Konten", icon: "layers" },
  { id: "calendar", label: "Kalender", icon: "calendar" },
  { id: "specialdays", label: "Hari Spesial", icon: "sun" },
  { id: "ringkasan", label: "Ringkasan", icon: "sparkle" },
  { id: "activity", label: "Riwayat", icon: "activity" },
  { id: "connections", label: "Manajemen Akun", icon: "connections" },
];

const MenuIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);

export function Sidebar({ mobile, open, onClose }) {
  const app = useApp();
  const [swOpen, setSwOpen] = uSh(false);
  const swRef = React.useRef(null);
  const brandObj = app.activeBrand || { name: app.brands?.[0]?.name || "—", accounts: app.brandAccounts || [] };
  const accounts = app.brandAccounts || [];

  // Close the brand dropdown on outside click / Escape. (A fixed overlay won't work:
  // the sidebar's backdrop-filter traps position:fixed, so it can't cover the page.)
  React.useEffect(() => {
    if (!swOpen) return;
    const onDoc = (e) => { if (!swRef.current?.contains(e.target)) setSwOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setSwOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [swOpen]);

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

      {/* brand switcher + account chips */}
      <div style={{ marginBottom: 18 }}>
        <div ref={swRef} style={{ position: "relative" }}>
          <button onClick={() => setSwOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11,
            padding: "9px 11px", background: "#fff", border: "1px solid var(--line)", borderRadius: 14, cursor: "pointer", boxShadow: "var(--shadow-sm)" }}>
            <BrandAvatar brand={brandAv(brandObj.name)} size={32} />
            <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
              <div style={{ fontFamily: FS, fontWeight: 600, fontSize: 13, color: "var(--ink-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{brandObj.name}</div>
              <div style={{ fontFamily: FS, fontSize: 10.5, color: "var(--ink-400)" }}>{accounts.length} akun sosial media</div>
            </div>
            <Icons.chevDown size={16} style={{ color: "var(--ink-400)", transform: swOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
          </button>
          {swOpen && (
            <>
              <div className="sc-scroll" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50, background: "#fff",
                borderRadius: 16, boxShadow: "var(--shadow-lg)", border: "1px solid var(--line)", padding: 6, animation: "scPop .15s", maxHeight: 380, overflowY: "auto" }}>
                <div style={{ fontFamily: FS, fontSize: 10, fontWeight: 600, letterSpacing: ".1em", color: "var(--ink-400)", padding: "8px 10px 6px" }}>GANTI BRAND</div>
                {app.brands.map(br => {
                  const on = br.id === app.brand;
                  return (
                    <button key={br.id} onClick={() => { app.selectBrand(br.id); setSwOpen(false); onClose && onClose(); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11,
                      padding: "9px 10px", border: "none", background: on ? "var(--primary-100)" : "transparent", borderRadius: 11, cursor: "pointer", marginBottom: 2 }}>
                      <BrandAvatar brand={brandAv(br.name)} size={30} />
                      <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                        <div style={{ fontFamily: FS, fontWeight: 600, fontSize: 12.5, color: "var(--ink-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{br.name}</div>
                        <div style={{ fontFamily: FS, fontSize: 10, color: "var(--ink-400)", display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                          {(br.accounts || []).slice(0, 6).map(a => <PlatIcon key={a.id} p={a.platform} size={13} />)}
                          <span style={{ marginLeft: 2 }}>{(br.accounts || []).length} akun</span>
                        </div>
                      </div>
                      {on && <Icons.check size={16} style={{ color: "var(--primary-500)" }} />}
                    </button>
                  );
                })}
                <div style={{ borderTop: "1px solid var(--line-soft)", marginTop: 4, paddingTop: 4 }}>
                  <button onClick={() => { setSwOpen(false); app.go("connections"); onClose && onClose(); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", border: "none", background: "transparent", borderRadius: 11, cursor: "pointer", color: "var(--ink-500)", fontFamily: FS, fontSize: 12.5, fontWeight: 600 }}>
                    <Icons.settings size={15} /> Kelola brand & akun
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* account sub-list for the active brand — which social media you're working in.
            Single account = a quiet label row; 2+ = a selectable sub-nav (active = white card, like the menu). */}
        {accounts.length > 0 ? (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 2 }}>
            {accounts.length > 1 && <div style={{ fontFamily: FS, fontSize: 9.5, fontWeight: 600, letterSpacing: ".1em", color: "var(--ink-300)", padding: "2px 11px 4px" }}>AKUN</div>}
            {accounts.map(a => {
              const multi = accounts.length > 1;
              const showSel = multi && a.id === app.channel;
              const dot = a.status === "Connected" ? "var(--st-success)" : a.status === "Expiring" ? "var(--st-publishing)" : "var(--st-failed)";
              return (
                <button key={a.id} onClick={() => { app.setChannel(a.id); onClose && onClose(); }} title={`${PLAT[a.platform]?.l || a.platform} · ${a.handle}${a.paused ? " · dijeda" : ""}`}
                  onMouseEnter={(e) => { if (multi && !showSel) e.currentTarget.style.background = "rgba(255,255,255,.55)"; }}
                  onMouseLeave={(e) => { if (!showSel) e.currentTarget.style.background = "transparent"; }}
                  style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 11px", borderRadius: 10, border: "none", width: "100%", textAlign: "left",
                    cursor: multi ? "pointer" : "default", background: showSel ? "#fff" : "transparent", boxShadow: showSel ? "var(--shadow-sm)" : "none", transition: "background .15s" }}>
                  <PlatIcon p={a.platform} size={16} />
                  <span style={{ flex: 1, minWidth: 0, fontFamily: FS, fontSize: 12, fontWeight: showSel ? 600 : 500, color: showSel ? "var(--ink-900)" : "var(--ink-600)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.handle}</span>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flex: "0 0 auto" }} />
                </button>
              );
            })}
          </div>
        ) : (
          <button onClick={() => { app.go("connections"); onClose && onClose(); }} style={{ marginTop: 8, width: "100%", padding: "8px 10px", border: "1px dashed var(--line)", background: "transparent", borderRadius: 11, cursor: "pointer", fontFamily: FS, fontSize: 11.5, color: "var(--ink-400)" }}>+ Tambah akun ke brand ini</button>
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
        <NavItem n={{ id: "settings", label: "Pengaturan", icon: "settings" }} active={app.view === "settings"} onClick={() => app.go("settings")} />
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
      {active && <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "var(--primary-500)" }} />}
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

  // Sticky on scroll (all pages). No backdrop-filter here: .app-shell already
  // blurs (40px) and #sc-root is scale-transformed, so a nested backdrop-filter
  // doesn't render in Chromium and content ghosts through. Instead the header
  // paints an OPAQUE frosted surface and dissolves at its bottom edge via a
  // masked feather strip — no hard line, content fades out as it slides under.
  //
  // Use the FLAT --canvas base (a solid per-theme tint), NOT --app-bg: the
  // latter's radials are anchored to THIS header box, so `at 100% 0%` would
  // paint a full-intensity bright peak at the header's top-right corner (by the
  // bell) that the feather then chops off — a visible "cut" seam that never
  // lines up with the viewport-anchored body gradient. A flat tint has no
  // corner peaks, so it blends seamlessly with the frosted shell in every theme.
  const surface = "linear-gradient(rgba(255,255,255,.42), rgba(255,255,255,.42)), var(--canvas)";
  // Geometry contract (keep all three in sync):
  //   • main#content has NO top padding — this header owns the page's top space,
  //     so its resting flow position equals its sticky position (top: 0) and it
  //     can never displace/overlap content on first paint.
  //   • Horizontal: full-bleed via negative side margins (cancels --content-pad).
  //   • Bottom: marginBottom (24) > feather height (18), so at rest the fade
  //     covers empty gap only; content dissolves under it only while scrolling.
  const stickyBase = {
    position: "sticky", top: 0, zIndex: 25,
    margin: "0 calc(var(--content-pad) * -1) 24px",
    background: surface,
  };
  const feather = (
    <span aria-hidden style={{ position: "absolute", left: 0, right: 0, top: "100%", height: 18, pointerEvents: "none",
      background: surface,
      WebkitMaskImage: "linear-gradient(to bottom, black, transparent)", maskImage: "linear-gradient(to bottom, black, transparent)" }} />
  );

  if (mobile) {
    return (
      <header style={{ ...stickyBase, display: "flex", flexDirection: "column", gap: 12, padding: "14px var(--content-pad) 10px" }}>
        {feather}
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
    <header style={{ ...stickyBase, display: "flex", alignItems: "center", gap: 16, padding: "18px var(--content-pad) 12px" }}>
      {feather}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FS, fontWeight: 600, fontSize: 23, color: "var(--ink-900)", letterSpacing: "-.01em" }}>{title}</div>
        {sub && <div style={{ fontFamily: FS, fontSize: 13, color: "var(--ink-400)", marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
      {bell}
    </header>
  );
}
