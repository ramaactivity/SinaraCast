"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Topbar } from "../shell";
import { BRANDS, BrandAvatar, Panel, Button, Select, Input, EmptyState, Skeleton, Segmented } from "../ui";
import { PLATFORM } from "./contentEditor";
const { useState: uPl } = React;
const FPl = "var(--font)";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTH_FULL = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const pad2 = (n) => String(n).padStart(2, "0");
const fmtDate = (ymd) => { if (!ymd) return "—"; const [Y, M, D] = ymd.split("-").map(Number); return `${D} ${MONTHS[M - 1]} ${Y}`; };
const brandFor = (slug, channels) => BRANDS[slug] || {
  name: channels.find(c => c.id === slug)?.name || slug,
  short: (channels.find(c => c.id === slug)?.name || slug || "?").slice(0, 2).toUpperCase(),
  accent: "var(--ink-500)", soft: "var(--line)", grad: "linear-gradient(135deg,#9aa0ab,#7a8090)",
};
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
const PlatTag = ({ p }) => { const m = platMeta(p); return (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FPl, fontSize: 12, color: "var(--ink-700)", whiteSpace: "nowrap" }}>
    <span style={{ width: 8, height: 8, borderRadius: 2, background: m.accent, flex: "0 0 auto" }} />{m.label}
  </span>
); };

export function PlannerView() {
  const app = useApp();
  const phase = app.dataLoading ? "loading" : "ready";
  const [brand, setBrand] = uPl("all");
  const [plat, setPlat] = uPl("all");
  const [stat, setStat] = uPl("all");
  const [month, setMonth] = uPl("all");           // "all" | "YYYY-MM"
  const [q, setQ] = uPl("");
  const [sortDir, setSortDir] = uPl("asc");        // by planned date

  const all = app.plans || [];
  // month options present in the data (+ All)
  const monthsPresent = [...new Set(all.map(p => p.ym).filter(Boolean))].sort();
  const monthOpts = [{ value: "all", label: "Semua bulan" }, ...monthsPresent.map(ym => { const [Y, M] = ym.split("-"); return { value: ym, label: `${MONTH_FULL[+M - 1]} ${Y}` }; })];
  const brandOpts = [{ value: "all", label: "Semua akun" }, ...app.channels.map(c => ({ value: c.id, label: brandFor(c.id, app.channels).name }))];
  const platOpts = [{ value: "all", label: "Semua platform" }, ...Object.entries(PLATFORM).map(([v, m]) => ({ value: v, label: m.label }))];
  const statOpts = [{ value: "all", label: "Semua status" }, ...PLAN_ORDER.map(s => ({ value: s, label: PLAN_LABEL[s] }))];

  const qn = q.trim().toLowerCase();
  const rows = all
    .filter(p => (brand === "all" || p.ch === brand)
      && (plat === "all" || p.platform === plat)
      && (stat === "all" || p.status === stat)
      && (month === "all" || p.ym === month)
      && (!qn || (p.title || "").toLowerCase().includes(qn) || (p.contentType || "").toLowerCase().includes(qn) || (p.pillar || "").toLowerCase().includes(qn)))
    .slice()
    .sort((a, b) => { const k = `${a.plannedDate} ${a.plannedTime}`.localeCompare(`${b.plannedDate} ${b.plannedTime}`); return sortDir === "asc" ? k : -k; });

  // summary counts (over the filtered set, ignoring status filter for the breakdown)
  const summaryBase = all.filter(p => (brand === "all" || p.ch === brand) && (plat === "all" || p.platform === plat) && (month === "all" || p.ym === month));
  const byStatus = {}; PLAN_ORDER.forEach(s => { const n = summaryBase.filter(p => p.status === s).length; if (n) byStatus[s] = n; });

  const create = () => app.go("contentEditor", { ch: brand === "all" ? app.channel : brand });
  const open = (p) => app.go("contentEditor", { id: p.id, ch: p.ch });
  const anyFilter = brand !== "all" || plat !== "all" || stat !== "all" || month !== "all" || !!qn;

  const TH = ({ children, w, onClick, active }) => (
    <th onClick={onClick} style={{ textAlign: "left", padding: "10px 12px", fontFamily: FPl, fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-400)", whiteSpace: "nowrap", width: w, cursor: onClick ? "pointer" : "default", userSelect: "none" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{children}{active && <Icons.chevDown size={13} style={{ transform: sortDir === "asc" ? "none" : "rotate(180deg)", transition: "transform .15s" }} />}</span>
    </th>
  );

  return (
    <div>
      <Topbar title="Rencana Konten" sub="Daftar semua konten yang kamu rencanakan · waktu WIB"
        right={<Button variant="amber" size="sm" icon={<Icons.plus size={17} sw={2} />} onClick={create}>Buat konten</Button>} />

      {/* summary strip */}
      {phase === "ready" && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: FPl, fontWeight: 800, fontSize: 22, color: "var(--ink-900)", letterSpacing: "-.02em" }}>{summaryBase.length}</span>
            <span style={{ fontFamily: FPl, fontSize: 12.5, color: "var(--ink-400)" }}>konten{month !== "all" ? ` · ${monthOpts.find(o => o.value === month)?.label}` : ""}</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(byStatus).map(([s, n]) => (
              <button key={s} onClick={() => setStat(cur => cur === s ? "all" : s)} style={{ border: "none", cursor: "pointer", background: stat === s ? tint(PLAN_ST_COLOR[s], 18) : "transparent", borderRadius: 999, padding: "3px 4px" }}>
                <StatusChip s={s} label={`${PLAN_LABEL[s]} ${n}`} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ width: app.isMobile ? "100%" : 240, flex: app.isMobile ? "1 1 100%" : "0 0 auto" }}>
          <Input icon={<Icons.search size={16} />} value={q} onChange={e => setQ(e.target.value)} placeholder="Cari judul / tipe / pilar…" />
        </div>
        <div style={{ width: app.isMobile ? "47%" : 150 }}><Select value={brand} onChange={setBrand} options={brandOpts} /></div>
        <div style={{ width: app.isMobile ? "47%" : 150 }}><Select value={plat} onChange={setPlat} options={platOpts} /></div>
        <div style={{ width: app.isMobile ? "47%" : 150 }}><Select value={stat} onChange={setStat} options={statOpts} /></div>
        <div style={{ width: app.isMobile ? "47%" : 160 }}><Select value={month} onChange={setMonth} options={monthOpts} /></div>
      </div>

      {phase === "loading" && <Panel><Skeleton h={22} w="40%" /><div style={{ height: 14 }} />{Array.from({ length: 8 }).map((_, i) => <div key={i} style={{ marginBottom: 8 }}><Skeleton h={44} r={10} /></div>)}</Panel>}

      {phase === "ready" && rows.length === 0 && (
        <Panel pad={0}><EmptyState icon={<Icons.layers size={28} />}
          title={anyFilter ? "Tidak ada yang cocok" : "Belum ada konten"}
          body={anyFilter ? "Coba ubah atau hapus filter." : "Mulai rencanakan konten pertamamu — judul, jadwal, status, semuanya di satu tempat."}
          action={anyFilter
            ? <Button variant="secondary" onClick={() => { setBrand("all"); setPlat("all"); setStat("all"); setMonth("all"); setQ(""); }}>Hapus filter</Button>
            : <Button variant="amber" icon={<Icons.plus size={16} />} onClick={create}>Buat konten</Button>} />
        </Panel>
      )}

      {/* desktop: spreadsheet-style table; mobile: stacked cards */}
      {phase === "ready" && rows.length > 0 && (app.isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {rows.map(p => {
            const b = brandFor(p.ch, app.channels), pm = platMeta(p.platform);
            return (
              <button key={p.id} onClick={() => open(p)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 12px", border: "1px solid var(--line)", borderLeft: `3px solid ${pm.accent}`, borderRadius: 13, background: "#fff", cursor: "pointer", textAlign: "left", width: "100%" }}>
                <BrandAvatar brand={b} src={app.channels.find(c => c.id === p.ch)?.avatarUrl} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FPl, fontWeight: 600, fontSize: 13, color: "var(--ink-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title || "(tanpa judul)"}</div>
                  <div style={{ fontFamily: FPl, fontSize: 11.5, color: "var(--ink-400)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fmtDate(p.plannedDate)}{p.plannedTime ? ` · ${p.plannedTime}` : ""} · {pm.label}{p.format ? ` · ${FORMAT_LABEL[p.format] || p.format}` : ""}</div>
                </div>
                <StatusChip s={p.status} />
              </button>
            );
          })}
        </div>
      ) : (
        <Panel pad={0} style={{ overflow: "hidden" }}>
          <div className="sc-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)", background: "rgba(140,144,158,.04)" }}>
                  <TH w={132} onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")} active>Tanggal</TH>
                  <TH w={170}>Akun</TH>
                  <TH w={130}>Platform</TH>
                  <TH w={120}>Tipe</TH>
                  <TH w={130}>Format</TH>
                  <TH>Judul</TH>
                  <TH w={110}>Status</TH>
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => {
                  const b = brandFor(p.ch, app.channels);
                  return (
                    <tr key={p.id} onClick={() => open(p)} style={{ borderBottom: "1px solid var(--line-soft)", cursor: "pointer", background: "#fff" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--primary-100)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}>
                      <td style={{ padding: "11px 12px", fontFamily: FPl, fontSize: 12.5, color: "var(--ink-700)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                        {fmtDate(p.plannedDate)}{p.plannedTime && <span style={{ color: "var(--ink-400)" }}> · {p.plannedTime}</span>}
                      </td>
                      <td style={{ padding: "9px 12px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <BrandAvatar brand={b} src={app.channels.find(c => c.id === p.ch)?.avatarUrl} size={24} />
                          <span style={{ fontFamily: FPl, fontSize: 12.5, color: "var(--ink-800)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>{b.name}</span>
                        </span>
                      </td>
                      <td style={{ padding: "11px 12px" }}><PlatTag p={p.platform} /></td>
                      <td style={{ padding: "11px 12px", fontFamily: FPl, fontSize: 12.5, color: p.contentType ? "var(--ink-700)" : "var(--ink-300)", whiteSpace: "nowrap" }}>{p.contentType || "—"}</td>
                      <td style={{ padding: "11px 12px", fontFamily: FPl, fontSize: 12.5, color: p.format ? "var(--ink-700)" : "var(--ink-300)", whiteSpace: "nowrap" }}>{p.format ? (FORMAT_LABEL[p.format] || p.format) : "—"}</td>
                      <td style={{ padding: "11px 12px", fontFamily: FPl, fontSize: 13, fontWeight: 500, color: p.title ? "var(--ink-900)" : "var(--ink-300)", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                          {p.linked && <Icons.sparkle size={13} style={{ color: "var(--st-publishing)", flex: "0 0 auto" }} title="Auto-publish" />}
                          {p.title || "(tanpa judul)"}
                        </span>
                      </td>
                      <td style={{ padding: "11px 12px" }}><StatusChip s={p.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}
    </div>
  );
}
