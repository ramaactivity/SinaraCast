"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Topbar } from "../shell";
import { Panel, Button, Select, Skeleton, EmptyState, Sparkline, PlatIcon } from "../ui";
import { PLATFORM } from "./contentEditor";
const { useState: uRk } = React;
const FRk = "var(--font)";

const MONTH_FULL = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const platMeta = (p) => PLATFORM[p] || { label: p || "—", accent: "var(--ink-500)" };
const tint = (c, pct = 12) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;
const PLAN_ORDER = ["idea", "draft", "review", "approved", "revision", "ready", "posted"];
const PLAN_LABEL = { idea: "Ide", draft: "Draf", review: "Review", approved: "Disetujui", revision: "Revisi", ready: "Siap", posted: "Posted" };
const PLAN_ST_COLOR = {
  idea: "var(--st-skipped)", draft: "var(--st-skipped)", review: "var(--st-publishing)",
  approved: "var(--st-scheduled)", revision: "var(--st-failed)", ready: "var(--st-scheduled)", posted: "var(--st-success)",
};
const fmtCompact = (n) => {
  if (n == null) return "—";
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(".0", "") + "jt";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(".0", "") + "rb";
  return String(n);
};

function Stat({ label, value, sub, color }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: FRk, fontSize: 11.5, color: "var(--ink-400)", fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: FRk, fontSize: 22, fontWeight: 700, color: color || "var(--ink-900)", margin: "3px 0 1px", letterSpacing: "-.02em" }}>{value}</div>
      <div style={{ fontFamily: FRk, fontSize: 11, color: "var(--ink-400)" }}>{sub}</div>
    </div>
  );
}
const Div = () => <div style={{ width: 1, alignSelf: "stretch", background: "var(--line)" }} />;

export function RingkasanView() {
  const app = useApp();
  const phase = app.dataLoading ? "loading" : "ready";
  const brand = app.activeBrand;
  const accounts = app.brandAccounts || [];
  const [month, setMonth] = uRk("all");
  // Reset the month filter on brand switch (month options are per-brand).
  React.useEffect(() => { setMonth("all"); }, [app.brand]);

  const brandPlans = (app.plans || []).filter(p => p.brandId === app.brand);
  const monthsPresent = [...new Set(brandPlans.map(p => p.ym).filter(Boolean))].sort().reverse();
  const monthOpts = [{ value: "all", label: "Semua waktu" }, ...monthsPresent.map(ym => { const [Y, M] = ym.split("-"); return { value: ym, label: `${MONTH_FULL[+M - 1]} ${Y}` }; })];
  const scoped = month === "all" ? brandPlans : brandPlans.filter(p => p.ym === month);

  const byStatus = {}; PLAN_ORDER.forEach(s => { const n = scoped.filter(p => p.status === s).length; if (n) byStatus[s] = n; });
  const byPlatform = {}; scoped.forEach(p => { byPlatform[p.platform] = (byPlatform[p.platform] || 0) + 1; });
  const postedCt = scoped.filter(p => p.status === "posted").length;
  const inProgress = scoped.filter(p => !["posted"].includes(p.status)).length;

  // aggregate performance from entries that have metrics filled (manual now, auto when IG insights unlocks)
  const withMetrics = scoped.filter(p => p.status === "posted" && p.m && Object.values(p.m).some(v => v != null));
  const sum = (k) => withMetrics.reduce((a, p) => a + (Number(p.m?.[k]) || 0), 0);
  const perf = [
    { k: "views", label: "Dilihat", icon: <Icons.activity size={15} /> },
    { k: "reach", label: "Jangkauan", icon: <Icons.storage size={15} /> },
    { k: "likes", label: "Suka", icon: <Icons.checkCircle size={15} /> },
    { k: "comments", label: "Komentar", icon: <Icons.bell size={15} /> },
    { k: "shares", label: "Dibagikan", icon: <Icons.external size={15} /> },
    { k: "saves", label: "Disimpan", icon: <Icons.pin size={15} /> },
  ];

  if (phase === "ready" && !brand) {
    return <div><Topbar title="Ringkasan" /><Panel pad={0}><EmptyState icon={<Icons.sparkle size={28} />} title="Belum ada brand" body="Tambahkan akun sosial media dulu untuk melihat ringkasannya." action={<Button variant="amber" onClick={() => app.go("connections")}>Buka Manajemen Akun</Button>} /></Panel></div>;
  }

  return (
    <div>
      <Topbar title="Ringkasan" sub={brand ? `${brand.name} · laporan konten & followers · WIB` : "·"}
        right={<div style={{ width: 190 }}><Select size="sm" value={month} onChange={setMonth} options={monthOpts} /></div>} />

      {phase === "loading" && <><Panel style={{ marginBottom: 16 }}><Skeleton h={20} w="40%" /><div style={{ height: 14 }} /><Skeleton h={40} /></Panel><Panel><Skeleton h={120} /></Panel></>}

      {phase === "ready" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* content totals */}
          <Panel pad={18}>
            <div style={app.isMobile ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 } : { display: "flex", alignItems: "center", gap: 26 }}>
              <Stat label="Total konten" value={scoped.length} sub={month === "all" ? `${accounts.length} akun` : monthOpts.find(o => o.value === month)?.label} />
              {!app.isMobile && <Div />}
              <Stat label="Sudah posted" value={postedCt} sub="terbit" color="var(--st-success)" />
              {!app.isMobile && <Div />}
              <Stat label="Dalam proses" value={inProgress} sub="ide → siap" />
              {!app.isMobile && <Div />}
              <Stat label="Akun" value={accounts.length} sub="sosial media" />
            </div>
          </Panel>

          {/* by status + by platform */}
          {scoped.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: app.isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
              <Panel>
                <div style={subhead}>Per status</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
                  {PLAN_ORDER.filter(s => byStatus[s]).map(s => {
                    const c = PLAN_ST_COLOR[s], pct = Math.round((byStatus[s] / scoped.length) * 100);
                    return (
                      <div key={s} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, flex: "0 0 auto" }} />
                        <span style={{ width: 78, fontFamily: FRk, fontSize: 12.5, color: "var(--ink-700)", flex: "0 0 auto" }}>{PLAN_LABEL[s]}</span>
                        <div style={{ flex: 1, height: 7, borderRadius: 999, background: "rgba(140,144,158,.14)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: c, borderRadius: 999 }} /></div>
                        <span style={{ width: 26, textAlign: "right", fontFamily: FRk, fontSize: 12.5, fontWeight: 700, color: "var(--ink-800)", fontVariantNumeric: "tabular-nums" }}>{byStatus[s]}</span>
                      </div>
                    );
                  })}
                </div>
              </Panel>
              <Panel>
                <div style={subhead}>Per platform</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
                  {Object.entries(byPlatform).sort((a, b) => b[1] - a[1]).map(([p, n]) => {
                    const m = platMeta(p), pct = Math.round((n / scoped.length) * 100);
                    return (
                      <div key={p} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <PlatIcon p={p} size={15} />
                        <span style={{ width: 78, fontFamily: FRk, fontSize: 12.5, color: "var(--ink-700)", flex: "0 0 auto" }}>{m.label}</span>
                        <div style={{ flex: 1, height: 7, borderRadius: 999, background: "rgba(140,144,158,.14)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: m.accent, borderRadius: 999 }} /></div>
                        <span style={{ width: 26, textAlign: "right", fontFamily: FRk, fontSize: 12.5, fontWeight: 700, color: "var(--ink-800)", fontVariantNumeric: "tabular-nums" }}>{n}</span>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>
          )}

          {/* performance (from entries with metrics) */}
          <Panel>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontFamily: FRk, fontWeight: 600, fontSize: 16, color: "var(--ink-900)" }}>Performa konten</div>
                <div style={{ fontFamily: FRk, fontSize: 12.5, color: "var(--ink-400)", marginTop: 2 }}>Dijumlahkan dari {withMetrics.length} konten yang metriknya terisi</div>
              </div>
            </div>
            {withMetrics.length === 0 ? (
              <div style={{ fontFamily: FRk, fontSize: 12.5, color: "var(--ink-400)", lineHeight: 1.5, background: "rgba(140,144,158,.07)", borderRadius: 12, padding: "14px 16px" }}>
                Belum ada metrik. Tandai konten <b>Posted</b> lalu isi performanya di editor (Instagram bisa terisi otomatis setelah izin insight aktif).
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: app.isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 12 }}>
                {perf.map(({ k, label, icon }) => (
                  <div key={k} style={{ border: "1px solid var(--line)", borderRadius: 14, padding: "13px 15px", background: "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: FRk, fontSize: 11.5, color: "var(--ink-400)", fontWeight: 500 }}><span style={{ color: "var(--ink-300)" }}>{icon}</span>{label}</div>
                    <div style={{ fontFamily: FRk, fontSize: 24, fontWeight: 700, color: "var(--ink-900)", marginTop: 5, letterSpacing: "-.02em" }}>{fmtCompact(sum(k))}</div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* follower trend per account */}
          <Panel>
            <div style={{ fontFamily: FRk, fontWeight: 600, fontSize: 16, color: "var(--ink-900)" }}>Pertumbuhan followers</div>
            <div style={{ fontFamily: FRk, fontSize: 12.5, color: "var(--ink-400)", marginTop: 2, marginBottom: 14 }}>Tercatat otomatis tiap hari per akun</div>
            {accounts.length === 0 ? (
              <div style={{ fontFamily: FRk, fontSize: 12.5, color: "var(--ink-400)" }}>Belum ada akun terhubung di brand ini.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {accounts.map(a => {
                  const series = (app.followerSeries?.[a.id] || []).filter(s => s.followers != null);
                  const cur = series.length ? series[series.length - 1].followers : null;
                  const first = series.length ? series[0].followers : null;
                  const delta = cur != null && first != null ? cur - first : null;
                  const m = platMeta(a.platform);
                  return (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, border: "1px solid var(--line)", borderRadius: 14, padding: "13px 16px", background: "#fff", flexWrap: app.isMobile ? "wrap" : "nowrap" }}>
                      <PlatIcon p={a.platform} size={20} />
                      <div style={{ minWidth: 0, flex: app.isMobile ? "1 1 60%" : "0 0 auto", width: app.isMobile ? "auto" : 150 }}>
                        <div style={{ fontFamily: FRk, fontWeight: 600, fontSize: 13, color: "var(--ink-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.handle}</div>
                        <div style={{ fontFamily: FRk, fontSize: 11, color: "var(--ink-400)" }}>{m.label}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: app.isMobile ? "flex-start" : "center" }}>
                        {series.length >= 2
                          ? <Sparkline data={series.map(s => s.followers)} w={app.isMobile ? 140 : 200} h={34} color={m.accent} />
                          : <span style={{ fontFamily: FRk, fontSize: 11.5, color: "var(--ink-300)" }}>Tren mulai terkumpul…</span>}
                      </div>
                      <div style={{ textAlign: "right", flex: "0 0 auto" }}>
                        <div style={{ fontFamily: FRk, fontSize: 18, fontWeight: 700, color: "var(--ink-900)", letterSpacing: "-.01em" }}>{cur != null ? fmtCompact(cur) : a.followers}</div>
                        {delta != null && delta !== 0
                          ? <div style={{ fontFamily: FRk, fontSize: 11.5, fontWeight: 600, color: delta > 0 ? "var(--st-success)" : "var(--st-failed)" }}>{delta > 0 ? "↑ +" : "↓ "}{fmtCompact(Math.abs(delta))}</div>
                          : <div style={{ fontFamily: FRk, fontSize: 11, color: "var(--ink-400)" }}>followers</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
const subhead = { fontFamily: FRk, fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ink-400)" };
