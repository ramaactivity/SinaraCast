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

// Follower change over the last N days: latest snapshot minus the newest snapshot
// at least N days older. Falls back to the oldest snapshot when history is shorter,
// so early days still show a meaningful number instead of nothing.
function deltaLastDays(series, n) {
  if (!series || series.length < 2) return null;
  const last = series[series.length - 1];
  const target = new Date(new Date(`${last.date}T00:00:00Z`).getTime() - n * 86400e3).toISOString().slice(0, 10);
  let base = series[0];
  for (const s of series) { if (s.date <= target) base = s; else break; }
  return last.followers - base.followers;
}

function DeltaText({ delta, sub }) {
  if (delta == null) return <div style={{ fontFamily: FRk, fontSize: 11, color: "var(--ink-400)" }}>followers</div>;
  if (delta === 0) return <div style={{ fontFamily: FRk, fontSize: 11, color: "var(--ink-400)" }}>stabil · {sub}</div>;
  const up = delta > 0;
  return <div style={{ fontFamily: FRk, fontSize: 11.5, fontWeight: 600, color: up ? "var(--st-success)" : "var(--st-failed)" }}>{up ? "↑ +" : "↓ -"}{fmtCompact(Math.abs(delta))} <span style={{ fontWeight: 500, color: "var(--ink-400)" }}>{sub}</span></div>;
}

function DeltaChip({ label, delta }) {
  const up = delta != null && delta > 0, down = delta != null && delta < 0;
  const c = up ? "var(--st-success)" : down ? "var(--st-failed)" : "var(--ink-400)";
  const bg = up ? "var(--green-100)" : down ? "var(--danger-bg)" : "rgba(140,144,158,.09)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: bg, borderRadius: 999, padding: "4px 11px" }}>
      <span style={{ fontFamily: FRk, fontSize: 10.5, fontWeight: 500, color: "var(--ink-500)" }}>{label}</span>
      <span style={{ fontFamily: FRk, fontSize: 11.5, fontWeight: 700, color: c, fontVariantNumeric: "tabular-nums" }}>
        {delta == null ? "—" : delta === 0 ? "0" : `${up ? "+" : "-"}${fmtCompact(Math.abs(delta))}`}
      </span>
    </span>
  );
}

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

  // ---- per-post performance: published runs in this brand + time scope ----
  const acctIds = new Set(accounts.map(a => a.id));
  const pubRuns = (app.runs || []).filter(r => r.status === "Published" && acctIds.has(r.ch) && (month === "all" || (r.dateWib || "").startsWith(month)));
  const runsWithM = pubRuns.filter(r => r.hasMetrics);

  // aggregate = auto-pulled run metrics + manually-filled planner metrics.
  // Plans whose metrics came from auto_ig mirror a run's media — skip to avoid double count.
  const withMetrics = scoped.filter(p => p.status === "posted" && p.m && Object.values(p.m).some(v => v != null));
  const manualPlans = withMetrics.filter(p => p.metricsSource === "manual");
  const sum = (k) =>
    runsWithM.reduce((a, r) => a + (Number(r.m?.[k]) || 0), 0) +
    manualPlans.reduce((a, p) => a + (Number(p.m?.[k]) || 0), 0);
  const sumComments = sum("comments") + runsWithM.reduce((a, r) => a + (Number(r.m?.replies) || 0), 0);
  const metricCt = runsWithM.length + manualPlans.length;
  const perf = [
    { k: "views", label: "Dilihat", icon: <Icons.eye size={15} /> },
    { k: "reach", label: "Jangkauan", icon: <Icons.user size={15} /> },
    { k: "likes", label: "Suka", icon: <Icons.heart size={15} /> },
    { k: "comments", label: "Komentar & balasan", icon: <Icons.comment size={15} />, value: sumComments },
    { k: "shares", label: "Dibagikan", icon: <Icons.send size={15} /> },
    { k: "saves", label: "Disimpan", icon: <Icons.bookmark size={15} /> },
  ];
  const topRun = [...runsWithM].sort((a, z) => (z.m?.views ?? z.m?.reach ?? 0) - (a.m?.views ?? a.m?.reach ?? 0))[0];

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

          {/* performance totals (auto-pulled run metrics + manual planner metrics) */}
          <Panel>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontFamily: FRk, fontWeight: 600, fontSize: 16, color: "var(--ink-900)" }}>Performa konten</div>
                <div style={{ fontFamily: FRk, fontSize: 12.5, color: "var(--ink-400)", marginTop: 2 }}>Dijumlahkan dari {metricCt} konten yang metriknya terisi</div>
              </div>
            </div>
            {metricCt === 0 ? (
              <div style={{ fontFamily: FRk, fontSize: 12.5, color: "var(--ink-400)", lineHeight: 1.5, background: "rgba(140,144,158,.07)", borderRadius: 12, padding: "14px 16px" }}>
                Belum ada metrik. Angka tertarik otomatis setelah konten terbit: Story diambil menjelang 24 jam tayang, Feed & Reels diperbarui tiap hari.
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: app.isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 12 }}>
                  {perf.map(({ k, label, icon, value }) => (
                    <div key={k} style={{ border: "1px solid var(--line)", borderRadius: 14, padding: "13px 15px", background: "#fff" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: FRk, fontSize: 11.5, color: "var(--ink-400)", fontWeight: 500 }}><span style={{ color: "var(--ink-300)" }}>{icon}</span>{label}</div>
                      <div style={{ fontFamily: FRk, fontSize: 24, fontWeight: 700, color: "var(--ink-900)", marginTop: 5, letterSpacing: "-.02em" }}>{fmtCompact(value ?? sum(k))}</div>
                    </div>
                  ))}
                </div>
                {topRun && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontFamily: FRk, fontSize: 12, color: "var(--ink-500)" }}>
                    <Icons.sparkle size={14} style={{ color: "#E0922A", flex: "0 0 auto" }} />
                    <span>Paling banyak dilihat: <b style={{ color: "var(--ink-800)" }}>{topRun.rule}</b> · {fmtCompact(topRun.m?.views ?? topRun.m?.reach)} {topRun.m?.views != null ? "dilihat" : "jangkauan"} · {topRun.dateWib}</span>
                  </div>
                )}
              </>
            )}
          </Panel>

          {/* per-post performance list */}
          <PerContent runs={pubRuns} isMobile={app.isMobile} />

          {/* follower trend per account */}
          <Panel>
            <div style={{ fontFamily: FRk, fontWeight: 600, fontSize: 16, color: "var(--ink-900)" }}>Pertumbuhan followers</div>
            <div style={{ fontFamily: FRk, fontSize: 12.5, color: "var(--ink-400)", marginTop: 2, marginBottom: 14 }}>Tercatat otomatis tiap hari per akun</div>
            {accounts.length === 0 ? (
              <div style={{ fontFamily: FRk, fontSize: 12.5, color: "var(--ink-400)" }}>Belum ada akun terhubung di brand ini.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {accounts.map(a => {
                  const all = (app.followerSeries?.[a.id] || []).filter(s => s.followers != null);
                  // the chart + main delta follow the page's time filter; the period
                  // chips always read from the full history
                  const series = month === "all" ? all : all.filter(s => (s.date || "").startsWith(month));
                  const cur = all.length ? all[all.length - 1].followers : null;
                  const scopeDelta = series.length >= 2 ? series[series.length - 1].followers - series[0].followers : null;
                  const m = platMeta(a.platform);
                  return (
                    <div key={a.id} style={{ border: "1px solid var(--line)", borderRadius: 14, padding: "13px 16px", background: "#fff" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: app.isMobile ? "wrap" : "nowrap" }}>
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
                          <DeltaText delta={scopeDelta} sub={month === "all" ? "sejak tercatat" : "bulan ini"} />
                        </div>
                      </div>
                      {all.length >= 2 && (
                        <div style={{ display: "flex", gap: 8, marginTop: 11, paddingTop: 11, borderTop: "1px solid var(--line-soft, var(--line))", flexWrap: "wrap" }}>
                          <DeltaChip label="Kemarin" delta={deltaLastDays(all, 1)} />
                          <DeltaChip label="7 hari" delta={deltaLastDays(all, 7)} />
                          <DeltaChip label="30 hari" delta={deltaLastDays(all, 30)} />
                        </div>
                      )}
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

/* ---------- Performa per konten ---------- */
const KIND_META = {
  story: { label: "Story", c: "#9579C4", bg: "var(--card-lilac)" },
  feed: { label: "Feed", c: "#E0922A", bg: "var(--primary-100)" },
  reels: { label: "Reels", c: "var(--green-500)", bg: "var(--green-100)" },
  tiktok_video: { label: "TikTok", c: "var(--ink-500)", bg: "rgba(140,144,158,.13)" },
};
const SORTS = [
  { value: "recent", label: "Terbaru" },
  { value: "views", label: "Paling dilihat" },
  { value: "reach", label: "Jangkauan terbesar" },
];

function MetricInline({ icon, v, title }) {
  if (v == null) return null;
  return (
    <span title={title} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ color: "var(--ink-300)", display: "inline-flex" }}>{icon}</span>
      <span style={{ fontFamily: FRk, fontSize: 12, fontWeight: 700, color: "var(--ink-800)", fontVariantNumeric: "tabular-nums" }}>{fmtCompact(v)}</span>
    </span>
  );
}

function PerContent({ runs, isMobile }) {
  const [sort, setSort] = uRk("recent");
  const [showAll, setShowAll] = uRk(false);
  const sorted = sort === "recent" ? runs
    : [...runs].sort((a, z) => ((z.m?.[sort] ?? -1) - (a.m?.[sort] ?? -1)));
  const rows = showAll ? sorted : sorted.slice(0, 10);

  return (
    <Panel>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontFamily: FRk, fontWeight: 600, fontSize: 16, color: "var(--ink-900)" }}>Performa per konten</div>
          <div style={{ fontFamily: FRk, fontSize: 12.5, color: "var(--ink-400)", marginTop: 2 }}>Metrik tertarik otomatis dari Instagram per postingan</div>
        </div>
        {runs.length > 1 && <div style={{ width: 178 }}><Select size="sm" value={sort} onChange={setSort} options={SORTS} /></div>}
      </div>

      {runs.length === 0 ? (
        <div style={{ fontFamily: FRk, fontSize: 12.5, color: "var(--ink-400)", lineHeight: 1.5, background: "rgba(140,144,158,.07)", borderRadius: 12, padding: "14px 16px" }}>
          Belum ada konten terbit pada rentang waktu ini.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {rows.map((r) => {
            const km = KIND_META[r.kind] || KIND_META.story;
            const isStory = r.kind === "story";
            const square = r.kind === "feed";
            const inner = (
              <>
                {r.thumbUrl
                  ? <img src={r.thumbUrl} alt="" style={{ width: square ? 46 : 36, height: square ? 46 : 54, objectFit: "cover", borderRadius: 9, border: "1px solid var(--line)", flex: "0 0 auto" }} />
                  : <div style={{ width: square ? 46 : 36, height: square ? 46 : 54, borderRadius: 9, border: "1px solid var(--line)", background: "rgba(140,144,158,.08)", display: "grid", placeItems: "center", color: "var(--ink-300)", flex: "0 0 auto" }}><Icons.image size={15} /></div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ fontFamily: FRk, fontWeight: 600, fontSize: 13, color: "var(--ink-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.rule}</span>
                    <span style={{ fontFamily: FRk, fontSize: 9.5, fontWeight: 700, color: km.c, background: km.bg, padding: "1px 8px", borderRadius: 999, flex: "0 0 auto" }}>{km.label}</span>
                    {r.link && <Icons.external size={12} style={{ color: "var(--ink-300)", flex: "0 0 auto" }} />}
                  </div>
                  <div style={{ fontFamily: FRk, fontSize: 11.5, color: "var(--ink-400)", marginTop: 3 }}>{r.actual !== "—" ? r.actual : r.sched} WIB</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 14, flexWrap: "wrap", justifyContent: "flex-end", flex: isMobile ? "1 1 100%" : "0 0 auto" }}>
                  {r.hasMetrics ? (
                    <>
                      <MetricInline icon={<Icons.eye size={13} />} v={r.m.views} title="Dilihat" />
                      <MetricInline icon={<Icons.user size={13} />} v={r.m.reach} title="Jangkauan" />
                      <MetricInline icon={<Icons.heart size={13} />} v={r.m.likes} title="Suka" />
                      <MetricInline icon={<Icons.comment size={13} />} v={isStory ? r.m.replies : r.m.comments} title={isStory ? "Balasan" : "Komentar"} />
                      <MetricInline icon={<Icons.send size={13} />} v={r.m.shares} title="Dibagikan" />
                      <MetricInline icon={<Icons.bookmark size={13} />} v={r.m.saves} title="Disimpan" />
                    </>
                  ) : (
                    <span style={{ fontFamily: FRk, fontSize: 11.5, color: "var(--ink-300)", fontStyle: "normal" }}>
                      {r.metricsPulledAt ? "metrik tidak tersedia" : isStory ? "metrik diambil menjelang 24 jam tayang" : "metrik menyusul, diperbarui harian"}
                    </span>
                  )}
                </div>
              </>
            );
            const rowStyle = { display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", border: "1px solid var(--line)", borderRadius: 13, background: "#fff", flexWrap: isMobile ? "wrap" : "nowrap", transition: "box-shadow .14s, border-color .14s" };
            return r.link ? (
              <a key={r.id} href={`https://${r.link}`} target="_blank" rel="noreferrer" title="Buka di Instagram"
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.borderColor = "var(--primary-200)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--line)"; }}
                style={{ ...rowStyle, textDecoration: "none", cursor: "pointer" }}>{inner}</a>
            ) : (
              <div key={r.id} style={rowStyle}>{inner}</div>
            );
          })}
          {sorted.length > 10 && (
            <button onClick={() => setShowAll(v => !v)} style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: FRk, fontSize: 12.5, fontWeight: 600, color: "var(--ink-400)", padding: "6px 0", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
              {showAll ? "Tampilkan lebih sedikit" : `Tampilkan semua (${sorted.length})`}
              <Icons.chevDown size={14} style={{ transform: showAll ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
            </button>
          )}
        </div>
      )}
    </Panel>
  );
}
