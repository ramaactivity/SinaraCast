"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp, useFetchState } from "../store";
import { Topbar } from "../shell";
import { BRANDS, BrandAvatar, Panel, Button, EmptyState, Skeleton, Segmented } from "../ui";
const { useState: uNo } = React;
const FN = "var(--font)";

const NTYPE = {
  error: ["var(--danger)", "var(--danger-bg)", (p) => <Icons.alert {...p} />],
  warn: ["var(--st-publishing)", "var(--st-publishing-bg)", (p) => <Icons.warn {...p} />],
  success: ["var(--green-500)", "var(--green-100)", (p) => <Icons.checkCircle {...p} />],
};
// Brand styling for a channel slug, with a neutral fallback for OAuth channels.
const brandFor = (slug, channels) => slug ? (BRANDS[slug] || {
  name: channels.find(c => c.id === slug)?.name || slug,
  accent: "var(--ink-500)", soft: "var(--line)", grad: "linear-gradient(135deg,#9aa0ab,#7a8090)",
}) : null;

export function NotificationsView() {
  const app = useApp();
  const phase = app.dataLoading ? "loading" : "ready";
  const [tab, setTab] = uNo("all");
  const notifs = app.notifs.filter(n => tab === "all" || (tab === "unread" && !n.read));
  const unread = app.notifs.filter(n => !n.read).length;

  return (
    <div>
      <Topbar title="Notifikasi" sub={`${unread} belum dibaca · sama dengan yang dikirim ke Telegram`}
        right={<div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Segmented options={[{ value: "all", label: "Semua" }, { value: "unread", label: `Belum dibaca${unread ? " · " + unread : ""}` }]} value={tab} onChange={setTab} />
          <Button variant="secondary" size="sm" icon={<Icons.check size={16} />} onClick={() => { app.markAllRead(); app.toast("Semua ditandai dibaca", "info"); }} disabled={!unread}>Tandai dibaca</Button>
        </div>} />

      <div style={{ maxWidth: 760 }}>
        <Panel flush style={{ overflow: "hidden" }}>
          {phase === "loading" && <div style={{ padding: 8 }}>{[0,1,2,3].map(i => <div key={i} style={{ display: "flex", gap: 13, padding: 16, borderBottom: "1px solid var(--line)" }}><Skeleton w={40} h={40} r={12} /><div style={{ flex: 1 }}><Skeleton w="45%" h={14} /><div style={{ height: 8 }} /><Skeleton w="80%" h={11} /></div></div>)}</div>}

          {phase === "ready" && notifs.length === 0 && <EmptyState icon={<Icons.bell size={28} />} title={tab === "unread" ? "Semua sudah dibaca" : "Belum ada notifikasi"} body={tab === "unread" ? "Tidak ada notifikasi yang belum dibaca." : "Pemberitahuan gagal terbit, koneksi bermasalah, dan jadwal terlewat akan muncul di sini."} />}

          {phase === "ready" && notifs.map((n, i) => {
            const [fg, bg, Ic] = NTYPE[n.type] || NTYPE.warn;
            const b = brandFor(n.ch, app.channels);
            return (
              <div key={n.id} onClick={() => { app.markRead(n.id); if (n.runId) app.go("activity"); }} style={{ display: "flex", gap: 13, padding: "16px 18px", borderBottom: i < notifs.length - 1 ? "1px solid var(--line)" : "none", cursor: "pointer", background: n.read ? "transparent" : "rgba(252,192,76,.06)", transition: "background .12s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(140,144,158,.06)"} onMouseLeave={e => e.currentTarget.style.background = n.read ? "transparent" : "rgba(252,192,76,.06)"}>
                <span style={{ width: 40, height: 40, borderRadius: 12, flex: "0 0 auto", display: "grid", placeItems: "center", background: bg, color: fg }}><Ic size={20} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ fontFamily: FN, fontWeight: 600, fontSize: 13.5, color: "var(--ink-900)" }}>{n.title}</span>
                    {!n.read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--primary-500)", flex: "0 0 auto" }} />}
                  </div>
                  <div style={{ fontFamily: FN, fontSize: 12.5, color: "var(--ink-500)", marginTop: 2, lineHeight: 1.45 }}>{n.body}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontFamily: FN, fontSize: 11, color: "var(--ink-400)" }}>
                    {b && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><BrandAvatar brand={b} size={14} />{b.name}</span>}
                    <span>·</span><span>{n.time}</span>
                    {n.runId && <span style={{ color: "var(--primary-500)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 3 }}>· Lihat run <Icons.chevRight size={12} /></span>}
                  </div>
                </div>
              </div>
            );
          })}
        </Panel>
      </div>
    </div>
  );
}
