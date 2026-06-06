"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Topbar } from "../shell";
import { BrandAvatar, Panel, Card, Button, Select, Input, EmptyState, Skeleton, Segmented, PlatIcon } from "../ui";
import { PLATFORM } from "./contentEditor";
const { useState: uPl } = React;
const FPl = "var(--font)";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTH_FULL = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const fmtDate = (ymd) => { if (!ymd) return "—"; const [Y, M, D] = ymd.split("-").map(Number); return `${D} ${MONTHS[M - 1]} ${Y}`; };
const platMeta = (p) => PLATFORM[p] || { label: p || "—", accent: "var(--ink-500)" };
const tint = (c, pct = 12) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;
const brandAv = (name) => ({ name: name || "—", short: (name || "?").slice(0, 2).toUpperCase(), grad: "var(--primary-grad)" });

const FORMAT_LABEL = { story: "Story", feed: "Feed", reels: "Reels", carousel: "Carousel", video: "Video", single_image: "Gambar tunggal", thread: "Thread" };
const PLAN_ORDER = ["idea", "draft", "review", "approved", "revision", "ready", "posted"];
const PLAN_LABEL = { idea: "Ide", draft: "Draf", review: "Review", approved: "Disetujui", revision: "Revisi", ready: "Siap", posted: "Posted" };
const PLAN_ST_COLOR = {
  idea: "var(--st-skipped)", draft: "var(--st-skipped)", review: "var(--st-publishing)",
  approved: "var(--st-scheduled)", revision: "var(--st-failed)", ready: "var(--st-scheduled)", posted: "var(--st-success)",
};
const StatusChip = ({ s }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FPl, fontSize: 11.5, fontWeight: 600, color: PLAN_ST_COLOR[s] || "var(--ink-500)", background: tint(PLAN_ST_COLOR[s] || "var(--ink-500)", 14), padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: PLAN_ST_COLOR[s] || "var(--ink-500)" }} />{PLAN_LABEL[s] || s}
  </span>
);
const PlatTag = ({ p, big }) => { const m = platMeta(p); return (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: FPl, fontSize: big ? 13 : 12, fontWeight: big ? 600 : 500, color: "var(--ink-800)", whiteSpace: "nowrap" }}>
    <PlatIcon p={p} size={big ? 16 : 14} />{m.label}
  </span>
); };

function Stat({ label, value, sub, color }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: FPl, fontSize: 11.5, color: "var(--ink-400)", fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: FPl, fontSize: 19, fontWeight: 600, color: color || "var(--ink-900)", margin: "3px 0 1px" }}>{value}</div>
      <div style={{ fontFamily: FPl, fontSize: 11, color: "var(--ink-400)" }}>{sub}</div>
    </div>
  );
}
const Div = () => <div style={{ width: 1, alignSelf: "stretch", background: "var(--line)" }} />;

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
  // Reset brand-specific filters on brand switch (month options + status differ per brand).
  React.useEffect(() => { setMonth("all"); setStat("all"); setPlat("all"); setQ(""); }, [app.brand]);

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

  // stat strip counts (respect platform + month, ignore status so the funnel reads true)
  const base = brandPlans.filter(p => (plat === "all" || p.platform === plat) && (month === "all" || p.ym === month));
  const ct = (set) => base.filter(p => set.includes(p.status)).length;
  const lanePlatforms = [...new Set([...accounts.map(a => a.platform), ...brandPlans.map(p => p.platform)])];

  const create = (platform) => app.go("contentEditor", { brand: brandId, platform });
  const open = (p) => app.go("contentEditor", { id: p.id });
  const anyFilter = plat !== "all" || stat !== "all" || month !== "all" || !!qn;
  const acctSub = accounts.length === 1 ? accounts[0].handle : `${accounts.length} akun sosial media`;

  const right = (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      {!app.isMobile && <Segmented options={[{ value: "table", label: "Tabel" }, { value: "lanes", label: "Per platform" }]} value={mode} onChange={setMode} />}
      <Button variant="amber" size="sm" icon={<Icons.plus size={17} sw={2} />} onClick={() => create()}>Buat konten</Button>
    </div>
  );

  if (phase === "ready" && !brand) {
    return (
      <div>
        <Topbar title="Rencana Konten" />
        <Panel pad={0}><EmptyState icon={<Icons.layers size={28} />} title="Belum ada brand" body="Tambahkan akun sosial media dulu. Tiap akun jadi sebuah brand yang bisa kamu kelola di sini." action={<Button variant="amber" onClick={() => app.go("connections")}>Buka Manajemen Akun</Button>} />
        </Panel>
      </div>
    );
  }

  const Row = ({ p, compact }) => {
    const m = platMeta(p.platform);
    return (
      <Card pad={0} hover onClick={() => open(p)} style={{ borderColor: "var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 14px" }}>
          <PlatIcon p={p.platform} size={16} />
          <span style={{ fontFamily: FPl, fontSize: 11.5, fontWeight: 700, color: "var(--ink-500)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", flex: "0 0 auto", minWidth: 60 }}>{fmtDate(p.plannedDate)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FPl, fontWeight: 600, fontSize: 13.5, color: p.title ? "var(--ink-900)" : "var(--ink-300)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {p.linked && <Icons.sparkle size={12} style={{ color: "var(--st-publishing)", marginRight: 5 }} />}{p.title || "(tanpa judul)"}
            </div>
            {!compact && <div style={{ fontFamily: FPl, fontSize: 11.5, color: "var(--ink-400)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.label}{p.format ? ` · ${FORMAT_LABEL[p.format] || p.format}` : ""}{p.contentType ? ` · ${p.contentType}` : ""}{p.plannedTime ? ` · ${p.plannedTime} WIB` : ""}</div>}
          </div>
          <StatusChip s={p.status} />
        </div>
      </Card>
    );
  };

  return (
    <div>
      <Topbar title="Rencana Konten"
        sub={brand ? <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><BrandAvatar brand={brandAv(brand.name)} size={18} /> {brand.name} · {acctSub} · WIB</span> : "·"}
        right={right} />

      {/* stat strip — only when there's content (mirrors Jadwal Otomatis) */}
      {phase === "ready" && brandPlans.length > 0 && (
        <Panel pad={18} style={{ marginBottom: 16 }}>
          <div style={app.isMobile ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 } : { display: "flex", alignItems: "center", gap: 26 }}>
            <Stat label={month === "all" ? "Total konten" : "Konten bulan ini"} value={base.length} sub={month === "all" ? `${accounts.length} akun · semua bulan` : monthOpts.find(o => o.value === month)?.label} />
            {!app.isMobile && <Div />}
            <Stat label="Ide & draf" value={ct(["idea", "draft"])} sub="perlu digarap" />
            {!app.isMobile && <Div />}
            <Stat label="Siap terbit" value={ct(["review", "approved", "revision", "ready"])} sub="dalam antrean" />
            {!app.isMobile && <Div />}
            <Stat label="Sudah posted" value={ct(["posted"])} sub="terbit" color="var(--st-success)" />
          </div>
        </Panel>
      )}

      {/* multi-account brands: show which socials this workspace covers */}
      {phase === "ready" && accounts.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
          {accounts.map(a => <span key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FPl, fontSize: 11.5, color: "var(--ink-600)", background: "#fff", border: "1px solid var(--line)", borderRadius: 999, padding: "4px 10px", boxShadow: "var(--shadow-sm)" }}><PlatIcon p={a.platform} size={13} />{platMeta(a.platform).label} · {a.handle}</span>)}
        </div>
      )}

      {/* filters (only when there's something to filter) */}
      {phase === "ready" && brandPlans.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: app.isMobile ? "1 1 100%" : "1 1 240px", minWidth: 0, maxWidth: app.isMobile ? "none" : 300 }}><Input icon={<Icons.search size={16} />} value={q} onChange={e => setQ(e.target.value)} placeholder="Cari judul, tipe, atau pilar…" /></div>
          <div style={{ width: app.isMobile ? "31%" : 172 }}><Select value={plat} onChange={setPlat} options={platOpts} /></div>
          <div style={{ width: app.isMobile ? "31%" : 160 }}><Select value={stat} onChange={setStat} options={statOpts} /></div>
          <div style={{ width: app.isMobile ? "31%" : 178 }}><Select value={month} onChange={setMonth} options={monthOpts} /></div>
        </div>
      )}

      {phase === "loading" && <Panel>{Array.from({ length: 7 }).map((_, i) => <div key={i} style={{ marginBottom: 8 }}><Skeleton h={46} r={12} /></div>)}</Panel>}

      {/* empty: no content at all in this brand */}
      {phase === "ready" && brandPlans.length === 0 && (
        <Panel pad={0}><EmptyState icon={<Icons.layers size={28} />} title="Belum ada konten"
          body={`Mulai rencanakan konten untuk ${brand?.name || "brand ini"} — judul, jadwal, status, semua platform di satu tempat.`}
          action={<Button variant="amber" icon={<Icons.plus size={16} sw={2} />} onClick={() => create()}>Buat konten pertama</Button>} />
        </Panel>
      )}

      {/* empty: filters exclude everything */}
      {phase === "ready" && brandPlans.length > 0 && rows.length === 0 && (
        <Panel pad={0}><EmptyState icon={<Icons.search size={26} />} title="Tidak ada yang cocok" body="Coba ubah atau hapus filter."
          action={<Button variant="secondary" onClick={() => { setPlat("all"); setStat("all"); setMonth("all"); setQ(""); }}>Hapus filter</Button>} compact />
        </Panel>
      )}

      {/* TABLE view (desktop) */}
      {phase === "ready" && rows.length > 0 && mode === "table" && !app.isMobile && (
        <Panel pad={0} style={{ overflow: "hidden" }}>
          <div className="sc-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
              <thead><tr style={{ borderBottom: "1px solid var(--line)", background: "rgba(140,144,158,.045)" }}>
                {[["Tanggal", 140, true], ["Platform", 140], ["Tipe", 130], ["Format", 140], ["Judul", null], ["Status", 112]].map(([label, w, sortable]) => (
                  <th key={label} onClick={sortable ? () => setSortDir(d => d === "asc" ? "desc" : "asc") : undefined} style={{ textAlign: "left", padding: "12px 14px", fontFamily: FPl, fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ink-400)", whiteSpace: "nowrap", width: w || undefined, cursor: sortable ? "pointer" : "default", userSelect: "none" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{label}{sortable && <Icons.chevDown size={13} style={{ transform: sortDir === "asc" ? "none" : "rotate(180deg)", transition: "transform .15s", color: "var(--ink-300)" }} />}</span>
                  </th>
                ))}
              </tr></thead>
              <tbody>
                {rows.map(p => (
                  <tr key={p.id} onClick={() => open(p)} style={{ borderBottom: "1px solid var(--line-soft)", cursor: "pointer", transition: "background .12s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--primary-100)"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                    <td style={{ padding: "12px 14px", fontFamily: FPl, fontSize: 12.5, color: "var(--ink-700)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{fmtDate(p.plannedDate)}{p.plannedTime && <span style={{ color: "var(--ink-400)" }}> · {p.plannedTime}</span>}</td>
                    <td style={{ padding: "12px 14px" }}><PlatTag p={p.platform} /></td>
                    <td style={{ padding: "12px 14px", fontFamily: FPl, fontSize: 12.5, color: p.contentType ? "var(--ink-700)" : "var(--ink-300)", whiteSpace: "nowrap" }}>{p.contentType || "—"}</td>
                    <td style={{ padding: "12px 14px", fontFamily: FPl, fontSize: 12.5, color: p.format ? "var(--ink-700)" : "var(--ink-300)", whiteSpace: "nowrap" }}>{p.format ? (FORMAT_LABEL[p.format] || p.format) : "—"}</td>
                    <td style={{ padding: "12px 14px", fontFamily: FPl, fontSize: 13, fontWeight: 500, color: p.title ? "var(--ink-900)" : "var(--ink-300)", maxWidth: 340, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>{p.linked && <Icons.sparkle size={13} style={{ color: "var(--st-publishing)" }} />}{p.title || "(tanpa judul)"}</span>
                    </td>
                    <td style={{ padding: "12px 14px" }}><StatusChip s={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* LANES view (per platform) + mobile card list */}
      {phase === "ready" && rows.length > 0 && (app.isMobile ? (
        mode === "lanes"
          ? <LaneGrid lanePlatforms={lanePlatforms} rows={rows} Row={Row} create={create} mobile />
          : <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>{rows.map(p => <Row key={p.id} p={p} />)}</div>
      ) : mode === "lanes" && (
        <LaneGrid lanePlatforms={lanePlatforms} rows={rows} Row={Row} create={create} />
      ))}
    </div>
  );
}

function LaneGrid({ lanePlatforms, rows, Row, create, mobile }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : `repeat(${Math.min(lanePlatforms.length || 1, 3)}, minmax(0,1fr))`, gap: 14, alignItems: "start" }}>
      {lanePlatforms.map(pf => {
        const m = platMeta(pf);
        const laneRows = rows.filter(p => p.platform === pf);
        return (
          <Panel key={pf} pad={14}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <PlatTag p={pf} big />
              <Button size="sm" variant="ghost" icon={<Icons.plus size={14} />} onClick={() => create(pf)}>Konten</Button>
            </div>
            {laneRows.length === 0
              ? <div style={{ fontFamily: FPl, fontSize: 12, color: "var(--ink-300)", padding: "14px 2px" }}>Belum ada konten {m.label}.</div>
              : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{laneRows.map(p => <Row key={p.id} p={p} compact />)}</div>}
          </Panel>
        );
      })}
    </div>
  );
}
