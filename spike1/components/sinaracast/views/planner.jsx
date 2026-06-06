"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Topbar } from "../shell";
import { Panel, Button, Select, Input, EmptyState, Skeleton, Segmented } from "../ui";
import { PLATFORM } from "./contentEditor";
const { useState: uPl } = React;
const FPl = "var(--font)";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTH_FULL = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const fmtDate = (ymd) => { if (!ymd) return "—"; const [Y, M, D] = ymd.split("-").map(Number); return `${D} ${MONTHS[M - 1]} ${Y}`; };
const platMeta = (p) => PLATFORM[p] || { label: p || "—", accent: "var(--ink-500)" };
const tint = (c, pct = 12) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

const FORMAT_LABEL = { story: "Story", feed: "Feed", reels: "Reels", carousel: "Carousel", video: "Video", single_image: "Gambar tunggal", thread: "Thread" };
const PLAN_ORDER = ["idea", "draft", "review", "approved", "revision", "ready", "posted"];
const PLAN_LABEL = { idea: "Ide", draft: "Draf", review: "Review", approved: "Disetujui", revision: "Revisi", ready: "Siap", posted: "Posted" };
const PLAN_ST_COLOR = {
  idea: "var(--st-skipped)", draft: "var(--st-skipped)", review: "var(--st-publishing)",
  approved: "var(--st-scheduled)", revision: "var(--st-failed)", ready: "var(--st-scheduled)", posted: "var(--st-success)",
};
const StatusChip = ({ s, label }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FPl, fontSize: 11.5, fontWeight: 600, color: PLAN_ST_COLOR[s] || "var(--ink-500)", background: tint(PLAN_ST_COLOR[s] || "var(--ink-500)", 14), padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: PLAN_ST_COLOR[s] || "var(--ink-500)" }} />{label || PLAN_LABEL[s] || s}
  </span>
);
const PlatTag = ({ p, big }) => { const m = platMeta(p); return (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: FPl, fontSize: big ? 13 : 12, fontWeight: big ? 600 : 500, color: "var(--ink-800)", whiteSpace: "nowrap" }}>
    <span style={{ width: big ? 9 : 8, height: big ? 9 : 8, borderRadius: 2, background: m.accent, flex: "0 0 auto" }} />{m.label}
  </span>
); };

export function PlannerView() {
  const app = useApp();
  const phase = app.dataLoading ? "loading" : "ready";
  const brandId = app.brand;
  const brand = app.activeBrand;
  const accounts = app.brandAccounts || [];
  const [plat, setPlat] = uPl("all");
  const [stat, setStat] = uPl("all");
  const [month, setMonth] = uPl("all");
  const [q, setQ] = uPl("");
  const [sortDir, setSortDir] = uPl("asc");
  const [mode, setMode] = uPl("table");          // table | lanes

  // scope to the active brand (workspace)
  const brandPlans = (app.plans || []).filter(p => p.brandId === brandId);
  const monthsPresent = [...new Set(brandPlans.map(p => p.ym).filter(Boolean))].sort();
  const monthOpts = [{ value: "all", label: "Semua bulan" }, ...monthsPresent.map(ym => { const [Y, M] = ym.split("-"); return { value: ym, label: `${MONTH_FULL[+M - 1]} ${Y}` }; })];
  const platOpts = [{ value: "all", label: "Semua platform" }, ...Object.entries(PLATFORM).map(([v, m]) => ({ value: v, label: m.label }))];
  const statOpts = [{ value: "all", label: "Semua status" }, ...PLAN_ORDER.map(s => ({ value: s, label: PLAN_LABEL[s] }))];

  const qn = q.trim().toLowerCase();
  const rows = brandPlans
    .filter(p => (plat === "all" || p.platform === plat) && (stat === "all" || p.status === stat) && (month === "all" || p.ym === month)
      && (!qn || (p.title || "").toLowerCase().includes(qn) || (p.contentType || "").toLowerCase().includes(qn) || (p.pillar || "").toLowerCase().includes(qn)))
    .slice().sort((a, b) => { const k = `${a.plannedDate} ${a.plannedTime}`.localeCompare(`${b.plannedDate} ${b.plannedTime}`); return sortDir === "asc" ? k : -k; });

  const summaryBase = brandPlans.filter(p => (plat === "all" || p.platform === plat) && (month === "all" || p.ym === month));
  const byStatus = {}; PLAN_ORDER.forEach(s => { const n = summaryBase.filter(p => p.status === s).length; if (n) byStatus[s] = n; });

  // platforms to show as lanes: the brand's connected accounts' platforms ∪ platforms used by its plans
  const lanePlatforms = [...new Set([...accounts.map(a => a.platform), ...brandPlans.map(p => p.platform)])];

  const create = (platform) => app.go("contentEditor", { brand: brandId, platform });
  const open = (p) => app.go("contentEditor", { id: p.id });
  const anyFilter = plat !== "all" || stat !== "all" || month !== "all" || !!qn;

  if (phase === "ready" && !brand) {
    return (
      <div>
        <Topbar title="Rencana Konten" />
        <Panel pad={0}><EmptyState icon={<Icons.layers size={28} />} title="Belum ada brand" body="Tambahkan akun sosial media dulu — tiap akun otomatis jadi sebuah brand yang bisa kamu kelola." action={<Button variant="amber" onClick={() => app.go("connections")}>Buka Manajemen Akun</Button>} />
        </Panel>
      </div>
    );
  }

  const Row = ({ p, compact }) => {
    const m = platMeta(p.platform);
    return (
      <button onClick={() => open(p)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", border: "1px solid var(--line)", borderLeft: `3px solid ${m.accent}`, borderRadius: 12, background: "#fff", cursor: "pointer", textAlign: "left", width: "100%" }}>
        <span style={{ fontFamily: FPl, fontSize: 11.5, fontWeight: 700, color: "var(--ink-500)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", flex: "0 0 auto", minWidth: 64 }}>{fmtDate(p.plannedDate)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FPl, fontWeight: 600, fontSize: 13, color: p.title ? "var(--ink-900)" : "var(--ink-300)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {p.linked && <Icons.sparkle size={12} style={{ color: "var(--st-publishing)", marginRight: 5 }} />}{p.title || "(tanpa judul)"}
          </div>
          {!compact && <div style={{ fontFamily: FPl, fontSize: 11.5, color: "var(--ink-400)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.label}{p.format ? ` · ${FORMAT_LABEL[p.format] || p.format}` : ""}{p.contentType ? ` · ${p.contentType}` : ""}{p.plannedTime ? ` · ${p.plannedTime} WIB` : ""}</div>}
        </div>
        <StatusChip s={p.status} />
      </button>
    );
  };

  return (
    <div>
      <Topbar title="Rencana Konten" sub={brand ? `${brand.name} · ${accounts.length} akun sosial media · WIB` : "·"}
        right={<div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {!app.isMobile && <Segmented options={[{ value: "table", label: "Tabel" }, { value: "lanes", label: "Per platform" }]} value={mode} onChange={setMode} />}
          <Button variant="amber" size="sm" icon={<Icons.plus size={17} sw={2} />} onClick={() => create()}>Buat konten</Button>
        </div>} />

      {/* accounts in this brand (which socials this workspace covers) */}
      {phase === "ready" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {accounts.map(a => <span key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FPl, fontSize: 11.5, color: "var(--ink-600)", background: "#fff", border: "1px solid var(--line)", borderRadius: 999, padding: "4px 10px" }}><span style={{ width: 7, height: 7, borderRadius: 2, background: platMeta(a.platform).accent }} />{platMeta(a.platform).label} · {a.handle}</span>)}
          {accounts.length === 0 && <span style={{ fontFamily: FPl, fontSize: 12, color: "var(--ink-400)" }}>Belum ada akun terhubung di brand ini — konten masih bisa direncanakan (plan-only).</span>}
          <span style={{ flex: 1 }} />
          <span style={{ fontFamily: FPl, fontWeight: 700, fontSize: 15, color: "var(--ink-900)" }}>{summaryBase.length}</span>
          <span style={{ fontFamily: FPl, fontSize: 12, color: "var(--ink-400)" }}>konten</span>
          {Object.entries(byStatus).map(([s, n]) => (
            <button key={s} onClick={() => setStat(cur => cur === s ? "all" : s)} style={{ border: "none", cursor: "pointer", background: stat === s ? tint(PLAN_ST_COLOR[s], 18) : "transparent", borderRadius: 999, padding: "2px 3px" }}><StatusChip s={s} label={`${PLAN_LABEL[s]} ${n}`} /></button>
          ))}
        </div>
      )}

      {/* filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ width: app.isMobile ? "100%" : 240, flex: app.isMobile ? "1 1 100%" : "0 0 auto" }}><Input icon={<Icons.search size={16} />} value={q} onChange={e => setQ(e.target.value)} placeholder="Cari judul / tipe / pilar…" /></div>
        <div style={{ width: app.isMobile ? "47%" : 160 }}><Select value={plat} onChange={setPlat} options={platOpts} /></div>
        <div style={{ width: app.isMobile ? "47%" : 150 }}><Select value={stat} onChange={setStat} options={statOpts} /></div>
        <div style={{ width: app.isMobile ? "47%" : 170 }}><Select value={month} onChange={setMonth} options={monthOpts} /></div>
      </div>

      {phase === "loading" && <Panel>{Array.from({ length: 8 }).map((_, i) => <div key={i} style={{ marginBottom: 8 }}><Skeleton h={44} r={10} /></div>)}</Panel>}

      {phase === "ready" && rows.length === 0 && (
        <Panel pad={0}><EmptyState icon={<Icons.layers size={28} />}
          title={anyFilter ? "Tidak ada yang cocok" : "Belum ada konten"}
          body={anyFilter ? "Coba ubah atau hapus filter." : `Mulai rencanakan konten untuk ${brand?.name || "brand ini"} — semua platform di satu tempat.`}
          action={anyFilter ? <Button variant="secondary" onClick={() => { setPlat("all"); setStat("all"); setMonth("all"); setQ(""); }}>Hapus filter</Button> : <Button variant="amber" icon={<Icons.plus size={16} />} onClick={() => create()}>Buat konten</Button>} />
        </Panel>
      )}

      {/* TABLE view (spreadsheet) */}
      {phase === "ready" && rows.length > 0 && mode === "table" && !app.isMobile && (
        <Panel pad={0} style={{ overflow: "hidden" }}>
          <div className="sc-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
              <thead><tr style={{ borderBottom: "1px solid var(--line)", background: "rgba(140,144,158,.04)" }}>
                {[["Tanggal", 132, true], ["Platform", 140], ["Tipe", 130], ["Format", 140], ["Judul", null], ["Status", 110]].map(([label, w, sortable]) => (
                  <th key={label} onClick={sortable ? () => setSortDir(d => d === "asc" ? "desc" : "asc") : undefined} style={{ textAlign: "left", padding: "10px 12px", fontFamily: FPl, fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-400)", whiteSpace: "nowrap", width: w || undefined, cursor: sortable ? "pointer" : "default", userSelect: "none" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{label}{sortable && <Icons.chevDown size={13} style={{ transform: sortDir === "asc" ? "none" : "rotate(180deg)" }} />}</span>
                  </th>
                ))}
              </tr></thead>
              <tbody>
                {rows.map(p => (
                  <tr key={p.id} onClick={() => open(p)} style={{ borderBottom: "1px solid var(--line-soft)", cursor: "pointer", background: "#fff" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--primary-100)"; }} onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}>
                    <td style={{ padding: "11px 12px", fontFamily: FPl, fontSize: 12.5, color: "var(--ink-700)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{fmtDate(p.plannedDate)}{p.plannedTime && <span style={{ color: "var(--ink-400)" }}> · {p.plannedTime}</span>}</td>
                    <td style={{ padding: "11px 12px" }}><PlatTag p={p.platform} /></td>
                    <td style={{ padding: "11px 12px", fontFamily: FPl, fontSize: 12.5, color: p.contentType ? "var(--ink-700)" : "var(--ink-300)", whiteSpace: "nowrap" }}>{p.contentType || "—"}</td>
                    <td style={{ padding: "11px 12px", fontFamily: FPl, fontSize: 12.5, color: p.format ? "var(--ink-700)" : "var(--ink-300)", whiteSpace: "nowrap" }}>{p.format ? (FORMAT_LABEL[p.format] || p.format) : "—"}</td>
                    <td style={{ padding: "11px 12px", fontFamily: FPl, fontSize: 13, fontWeight: 500, color: p.title ? "var(--ink-900)" : "var(--ink-300)", maxWidth: 340, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>{p.linked && <Icons.sparkle size={13} style={{ color: "var(--st-publishing)" }} />}{p.title || "(tanpa judul)"}</span>
                    </td>
                    <td style={{ padding: "11px 12px" }}><StatusChip s={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* LANES view (per platform) + mobile always uses card lists */}
      {phase === "ready" && rows.length > 0 && (mode === "lanes" || app.isMobile) && (
        app.isMobile && mode === "table" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>{rows.map(p => <Row key={p.id} p={p} />)}</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: app.isMobile ? "1fr" : `repeat(${Math.min(lanePlatforms.length || 1, 3)}, minmax(0,1fr))`, gap: 14, alignItems: "start" }}>
            {lanePlatforms.map(pf => {
              const m = platMeta(pf);
              const laneRows = rows.filter(p => p.platform === pf);
              return (
                <Panel key={pf} pad={14}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <PlatTag p={pf} big />
                    <Button size="sm" variant="ghost" icon={<Icons.plus size={14} />} onClick={() => create(pf)}>Konten</Button>
                  </div>
                  {laneRows.length === 0
                    ? <div style={{ fontFamily: FPl, fontSize: 12, color: "var(--ink-300)", padding: "12px 2px" }}>Belum ada konten {m.label}.</div>
                    : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{laneRows.map(p => <Row key={p.id} p={p} compact />)}</div>}
                </Panel>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
