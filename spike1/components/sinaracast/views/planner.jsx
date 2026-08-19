"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Topbar } from "../shell";
import { BrandAvatar, Panel, Card, Button, Select, Input, EmptyState, Skeleton, Segmented, PlatIcon, Modal, Field, Textarea, Checkbox, Spinner, NumberField } from "../ui";
import { PLATFORM } from "./contentEditor";
import { createContentPlansBatch, updateContentPlansStatus, deleteContentPlansBatch } from "../dataLayer";
import { t } from "../i18n";
const { useState: uPl } = React;
const FPl = "var(--font)";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTH_FULL = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const fmtDate = (ymd) => { if (!ymd) return "—"; const [Y, M, D] = ymd.split("-").map(Number); return `${D} ${t(MONTHS[M - 1])} ${Y}`; };
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
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: PLAN_ST_COLOR[s] || "var(--ink-500)" }} />{t(PLAN_LABEL[s]) || s}
  </span>
);
const PlatTag = ({ p, big }) => { const m = platMeta(p); return (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: FPl, fontSize: big ? 13 : 12, fontWeight: big ? 600 : 500, color: "var(--ink-800)", whiteSpace: "nowrap" }}>
    <PlatIcon p={p} size={big ? 16 : 14} />{t(m.label)}
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
  const [genOpen, setGenOpen] = uPl(false);      // AI idea generator modal
  const [sel, setSel] = uPl([]);                 // bulk selection (plan ids)
  const [busyBulk, setBusyBulk] = uPl(false);
  // Reset brand-specific filters on brand switch (month options + status differ per brand).
  React.useEffect(() => { setMonth("all"); setStat("all"); setPlat("all"); setQ(""); }, [app.brand]);
  // Clear selection when the visible set changes (filter/search/brand) — keep it predictable.
  React.useEffect(() => { setSel([]); }, [app.brand, plat, stat, month, q]);

  const brandPlans = (app.plans || []).filter(p => p.brandId === brandId);
  const monthsPresent = [...new Set(brandPlans.map(p => p.ym).filter(Boolean))].sort();
  const monthOpts = [{ value: "all", label: t("Semua bulan") }, ...monthsPresent.map(ym => { const [Y, M] = ym.split("-"); return { value: ym, label: `${t(MONTH_FULL[+M - 1])} ${Y}` }; })];
  const platOpts = [{ value: "all", label: t("Semua platform") }, ...Object.entries(PLATFORM).map(([v, m]) => ({ value: v, label: m.label }))];
  const statOpts = [{ value: "all", label: t("Semua status") }, ...PLAN_ORDER.map(s => ({ value: s, label: t(PLAN_LABEL[s]) }))];

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
  const acctSub = accounts.length === 1 ? accounts[0].handle : t("{0} akun sosial media", [accounts.length]);

  // ---- bulk selection ----
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allSel = rows.length > 0 && rows.every((r) => sel.includes(r.id));
  const toggleAll = () => setSel(allSel ? [] : rows.map((r) => r.id));
  async function bulkStatus(status) {
    if (!sel.length || busyBulk) return;
    setBusyBulk(true);
    try { await updateContentPlansStatus(sel, status); await app.reload(); app.toast(t("{0} konten → {1}", [sel.length, t(PLAN_LABEL[status])]), "success"); setSel([]); }
    catch (e) { app.toast(t("Gagal: {0}", [e.message || e]), "error"); }
    finally { setBusyBulk(false); }
  }
  function bulkDelete() {
    if (!sel.length) return;
    app.confirm({
      title: t("Hapus {0} konten?", [sel.length]), danger: true, confirmLabel: t("Hapus"),
      body: t("Semua entri rencana yang dipilih akan dihapus."), consequence: t("Tindakan ini tidak bisa dibatalkan."),
      onConfirm: async () => {
        try { await deleteContentPlansBatch(sel); await app.reload(); app.toast(t("{0} konten dihapus", [sel.length]), "success"); setSel([]); }
        catch (e) { app.toast(t("Gagal menghapus: {0}", [e.message || e]), "error"); }
      },
    });
  }

  const right = (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      {!app.isMobile && <Segmented options={[{ value: "table", label: t("Tabel") }, { value: "lanes", label: t("Per platform") }]} value={mode} onChange={setMode} />}
      <Button variant="secondary" size="sm" icon={<Icons.sparkle size={16} />} onClick={() => setGenOpen(true)}>{t("Ide AI")}</Button>
      <Button variant="amber" size="sm" icon={<Icons.plus size={17} sw={2} />} onClick={() => create()}>{t("Buat konten")}</Button>
    </div>
  );

  if (phase === "ready" && !brand) {
    return (
      <div>
        <Topbar title={t("Rencana Konten")} />
        <Panel pad={0}><EmptyState icon={<Icons.layers size={28} />} title={t("Belum ada brand")} body={t("Tambahkan akun sosial media dulu. Tiap akun jadi sebuah brand yang bisa kamu kelola di sini.")} action={<Button variant="amber" onClick={() => app.go("connections")}>{t("Buka Manajemen Akun")}</Button>} />
        </Panel>
      </div>
    );
  }

  const Row = ({ p, compact, onToggle, selected }) => {
    const m = platMeta(p.platform);
    return (
      <Card pad={0} hover onClick={() => open(p)} style={{ borderColor: selected ? "var(--primary-300)" : "var(--line)", background: selected ? "var(--primary-100)" : undefined }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 14px" }}>
          {onToggle && <div onClick={(e) => { e.stopPropagation(); onToggle(p.id); }} style={{ display: "flex", flex: "0 0 auto" }}><Checkbox checked={!!selected} onChange={() => onToggle(p.id)} size={18} /></div>}
          <PlatIcon p={p.platform} size={16} />
          <span style={{ fontFamily: FPl, fontSize: 11.5, fontWeight: 700, color: "var(--ink-500)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", flex: "0 0 auto", minWidth: 60 }}>{fmtDate(p.plannedDate)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FPl, fontWeight: 600, fontSize: 13.5, color: p.title ? "var(--ink-900)" : "var(--ink-300)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {p.linked && <Icons.sparkle size={12} style={{ color: "var(--st-publishing)", marginRight: 5 }} />}{p.title || t("(tanpa judul)")}
            </div>
            {!compact && <div style={{ fontFamily: FPl, fontSize: 11.5, color: "var(--ink-400)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t(m.label)}{p.format ? ` · ${FORMAT_LABEL[p.format] || p.format}` : ""}{p.contentType ? ` · ${p.contentType}` : ""}{p.plannedTime ? t(" · {0} WIB", [p.plannedTime]) : ""}</div>}
          </div>
          <StatusChip s={p.status} />
        </div>
      </Card>
    );
  };

  return (
    <div>
      <Topbar title={t("Rencana Konten")}
        sub={brand ? <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><BrandAvatar brand={brandAv(brand.name)} size={18} /> {brand.name} · {acctSub} {t("· WIB")}</span> : "·"}
        right={right} />

      {/* stat strip — only when there's content (mirrors Jadwal Otomatis) */}
      {phase === "ready" && brandPlans.length > 0 && (
        <Panel pad={18} style={{ marginBottom: 16 }}>
          <div style={app.isMobile ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 } : { display: "flex", alignItems: "center", gap: 26 }}>
            <Stat label={month === "all" ? t("Total konten") : t("Konten bulan ini")} value={base.length} sub={month === "all" ? t("{0} akun · semua bulan", [accounts.length]) : monthOpts.find(o => o.value === month)?.label} />
            {!app.isMobile && <Div />}
            <Stat label={t("Ide & draf")} value={ct(["idea", "draft"])} sub={t("perlu digarap")} />
            {!app.isMobile && <Div />}
            <Stat label={t("Siap terbit")} value={ct(["review", "approved", "revision", "ready"])} sub={t("dalam antrean")} />
            {!app.isMobile && <Div />}
            <Stat label={t("Sudah posted")} value={ct(["posted"])} sub={t("terbit")} color="var(--st-success)" />
          </div>
        </Panel>
      )}

      {/* multi-account brands: show which socials this workspace covers */}
      {phase === "ready" && accounts.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
          {accounts.map(a => <span key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FPl, fontSize: 11.5, color: "var(--ink-600)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 999, padding: "4px 10px", boxShadow: "var(--shadow-sm)" }}><PlatIcon p={a.platform} size={13} />{t(platMeta(a.platform).label)} · {a.handle}</span>)}
        </div>
      )}

      {/* filters (only when there's something to filter) */}
      {phase === "ready" && brandPlans.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: app.isMobile ? "1 1 100%" : "1 1 240px", minWidth: 0, maxWidth: app.isMobile ? "none" : 300 }}><Input icon={<Icons.search size={16} />} value={q} onChange={e => setQ(e.target.value)} placeholder={t("Cari judul, tipe, atau pilar…")} /></div>
          <div style={{ width: app.isMobile ? "31%" : 172 }}><Select value={plat} onChange={setPlat} options={platOpts} /></div>
          <div style={{ width: app.isMobile ? "31%" : 160 }}><Select value={stat} onChange={setStat} options={statOpts} /></div>
          <div style={{ width: app.isMobile ? "31%" : 178 }}><Select value={month} onChange={setMonth} options={monthOpts} /></div>
        </div>
      )}

      {/* bulk action toolbar */}
      {phase === "ready" && sel.length > 0 && (
        <Panel pad={0} style={{ marginBottom: 14, border: "1px solid var(--primary-300)", background: "var(--primary-100)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", flexWrap: "wrap" }}>
            <span style={{ fontFamily: FPl, fontWeight: 600, fontSize: 13, color: "var(--ink-900)" }}>{sel.length} {t("dipilih")}</span>
            <div style={{ width: app.isMobile ? "100%" : 190 }}>
              <Select value="" placeholder={t("Ubah status…")} onChange={(v) => v && bulkStatus(v)} options={PLAN_ORDER.map((s) => ({ value: s, label: t(PLAN_LABEL[s]) }))} />
            </div>
            <Button size="sm" variant="danger" icon={busyBulk ? <Spinner size={14} /> : <Icons.trash size={14} />} disabled={busyBulk} onClick={bulkDelete}>{t("Hapus")}</Button>
            <Button size="sm" variant="ghost" onClick={() => setSel([])} style={{ marginLeft: app.isMobile ? 0 : "auto" }}>{t("Batal pilih")}</Button>
          </div>
        </Panel>
      )}

      {phase === "loading" && <Panel>{Array.from({ length: 7 }).map((_, i) => <div key={i} style={{ marginBottom: 8 }}><Skeleton h={46} r={12} /></div>)}</Panel>}

      {/* empty: no content at all in this brand */}
      {phase === "ready" && brandPlans.length === 0 && (
        <Panel pad={0}><EmptyState icon={<Icons.layers size={28} />} title={t("Belum ada konten")}
          body={t("Mulai rencanakan konten untuk {0} — judul, jadwal, status, semua platform di satu tempat. Atau biar AI yang usulkan ide dulu.", [brand?.name || t("brand ini")])}
          action={<div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <Button variant="amber" icon={<Icons.sparkle size={16} />} onClick={() => setGenOpen(true)}>{t("Buatkan ide dengan AI")}</Button>
            <Button variant="secondary" icon={<Icons.plus size={16} sw={2} />} onClick={() => create()}>{t("Buat manual")}</Button>
          </div>} />
        </Panel>
      )}

      {/* empty: filters exclude everything */}
      {phase === "ready" && brandPlans.length > 0 && rows.length === 0 && (
        <Panel pad={0}><EmptyState icon={<Icons.search size={26} />} title={t("Tidak ada yang cocok")} body={t("Coba ubah atau hapus filter.")}
          action={<Button variant="secondary" onClick={() => { setPlat("all"); setStat("all"); setMonth("all"); setQ(""); }}>{t("Hapus filter")}</Button>} compact />
        </Panel>
      )}

      {/* TABLE view (desktop) */}
      {phase === "ready" && rows.length > 0 && mode === "table" && !app.isMobile && (
        <Panel pad={0} style={{ overflow: "hidden" }}>
          <div className="sc-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
              <thead><tr style={{ borderBottom: "1px solid var(--line)", background: "rgba(140,144,158,.045)" }}>
                <th style={{ padding: "12px 8px 12px 16px", width: 42 }}><div onClick={(e) => e.stopPropagation()}><Checkbox checked={allSel} onChange={toggleAll} size={17} /></div></th>
                {[["Tanggal", 140, true], ["Platform", 140], ["Tipe", 130], ["Format", 140], ["Judul", null], ["Status", 112]].map(([label, w, sortable]) => (
                  <th key={label} onClick={sortable ? () => setSortDir(d => d === "asc" ? "desc" : "asc") : undefined} style={{ textAlign: "left", padding: "12px 14px", fontFamily: FPl, fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ink-400)", whiteSpace: "nowrap", width: w || undefined, cursor: sortable ? "pointer" : "default", userSelect: "none" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{t(label)}{sortable && <Icons.chevDown size={13} style={{ transform: sortDir === "asc" ? "none" : "rotate(180deg)", transition: "transform .15s", color: "var(--ink-300)" }} />}</span>
                  </th>
                ))}
              </tr></thead>
              <tbody>
                {rows.map(p => { const on = sel.includes(p.id); return (
                  <tr key={p.id} onClick={() => open(p)} style={{ borderBottom: "1px solid var(--line-soft)", cursor: "pointer", transition: "background .12s", background: on ? "var(--primary-100)" : "transparent" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--primary-100)"; }} onMouseLeave={e => { e.currentTarget.style.background = on ? "var(--primary-100)" : "transparent"; }}>
                    <td style={{ padding: "12px 8px 12px 16px", width: 42 }} onClick={(e) => { e.stopPropagation(); toggle(p.id); }}><Checkbox checked={on} onChange={() => toggle(p.id)} size={17} /></td>
                    <td style={{ padding: "12px 14px", fontFamily: FPl, fontSize: 12.5, color: "var(--ink-700)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{fmtDate(p.plannedDate)}{p.plannedTime && <span style={{ color: "var(--ink-400)" }}> · {p.plannedTime}</span>}</td>
                    <td style={{ padding: "12px 14px" }}><PlatTag p={p.platform} /></td>
                    <td style={{ padding: "12px 14px", fontFamily: FPl, fontSize: 12.5, color: p.contentType ? "var(--ink-700)" : "var(--ink-300)", whiteSpace: "nowrap" }}>{p.contentType || "—"}</td>
                    <td style={{ padding: "12px 14px", fontFamily: FPl, fontSize: 12.5, color: p.format ? "var(--ink-700)" : "var(--ink-300)", whiteSpace: "nowrap" }}>{p.format ? (FORMAT_LABEL[p.format] || p.format) : "—"}</td>
                    <td style={{ padding: "12px 14px", fontFamily: FPl, fontSize: 13, fontWeight: 500, color: p.title ? "var(--ink-900)" : "var(--ink-300)", maxWidth: 340, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>{p.linked && <Icons.sparkle size={13} style={{ color: "var(--st-publishing)" }} />}{p.title || t("(tanpa judul)")}</span>
                    </td>
                    <td style={{ padding: "12px 14px" }}><StatusChip s={p.status} /></td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* LANES view (per platform) + mobile card list */}
      {phase === "ready" && rows.length > 0 && (app.isMobile ? (
        mode === "lanes"
          ? <LaneGrid lanePlatforms={lanePlatforms} rows={rows} Row={Row} create={create} mobile />
          : <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>{rows.map(p => <Row key={p.id} p={p} onToggle={toggle} selected={sel.includes(p.id)} />)}</div>
      ) : mode === "lanes" && (
        <LaneGrid lanePlatforms={lanePlatforms} rows={rows} Row={Row} create={create} />
      ))}

      <IdeaGenerator open={genOpen} onClose={() => setGenOpen(false)}
        brandId={brandId} brandName={brand?.name || ""} accounts={accounts}
        token={app.session?.access_token} toast={app.toast} reload={app.reload} go={app.go} />
    </div>
  );
}

// Helper: tanggal WIB 'YYYY-MM-DD' + offset hari.
const pad2 = (n) => String(n).padStart(2, "0");
function wibDatePlus(days) {
  const d = new Date(Date.now() + 7 * 3600 * 1000 + days * 86400 * 1000);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

// Generator ide massal: konfigurasi → AI usulkan ide → pilih → simpan sebagai entri
// rencana (status Ide), tanggal disebar. Mengikuti karakter akun (persona).
function IdeaGenerator({ open, onClose, brandId, brandName, accounts, token, toast, reload, go }) {
  const [platform, setPlatform] = uPl(accounts[0]?.platform || "instagram");
  const [count, setCount] = uPl(8);
  const [seed, setSeed] = uPl("");
  const [pillars, setPillars] = uPl("");
  const [busy, setBusy] = uPl(false);
  const [saving, setSaving] = uPl(false);
  const [ideas, setIdeas] = uPl(null);   // null = belum generate; [] = kosong
  const [picked, setPicked] = uPl({});

  React.useEffect(() => { if (open) { setIdeas(null); setPicked({}); setSeed(""); setPillars(""); setPlatform(accounts[0]?.platform || "instagram"); } }, [open]); // eslint-disable-line

  const platOpts = [...new Set([...accounts.map((a) => a.platform), "instagram"])].map((p) => ({ value: p, label: platMeta(p).label }));
  const persona = accounts.find((a) => a.platform === platform)?.aiPersona || accounts[0]?.aiPersona || null;

  async function generate() {
    if (busy) return; setBusy(true);
    try {
      const r = await fetch("/api/plan", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ task: "ideas", brandName, platform, persona, count, seed, pillars }),
      });
      const j = await r.json();
      if (!j.ok) { toast(j.error || t("Gagal membuat ide"), "error"); return; }
      setIdeas(j.ideas || []);
      setPicked(Object.fromEntries((j.ideas || []).map((_, i) => [i, true])));
    } catch (e) { toast(t("Gagal: {0}", [e.message || e]), "error"); }
    finally { setBusy(false); }
  }

  async function savePicked() {
    if (saving) return;
    const chosen = (ideas || []).filter((_, i) => picked[i]);
    if (!chosen.length) { toast(t("Pilih minimal satu ide."), "info"); return; }
    setSaving(true);
    try {
      const channelDbId = accounts.find((a) => a.platform === platform)?._id || null;
      const items = chosen.map((idea, i) => ({
        brandDbId: brandId, channelDbId, platform,
        plannedDate: wibDatePlus(1 + i * 2), plannedTime: null,
        title: idea.title, contentType: idea.contentType, pillar: idea.pillar,
        format: idea.format, goal: idea.goal,
        notes: idea.angle ? `Angle: ${idea.angle}` : null,
        status: "idea",
      }));
      await createContentPlansBatch(items);
      await reload();
      toast(t("{0} ide ditambahkan ke rencana ✓", [items.length]), "success");
      onClose();
    } catch (e) { toast(t("Gagal menyimpan: {0}", [e.message || e]), "error"); }
    finally { setSaving(false); }
  }

  const pickedCount = Object.values(picked).filter(Boolean).length;

  return (
    <Modal open={open} onClose={() => !busy && !saving && onClose()} width={620}>
      <div style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
          <span style={{ color: "var(--st-publishing)", display: "inline-flex" }}><Icons.sparkle size={18} /></span>
          <span style={{ fontFamily: FPl, fontWeight: 600, fontSize: 16, color: "var(--ink-900)" }}>{t("Buatkan ide konten dengan AI")}</span>
        </div>
        <div style={{ fontFamily: FPl, fontSize: 12.5, color: "var(--ink-500)", marginBottom: 16 }}>{t("Untuk")} {brandName || t("brand ini")}{t(". Ide mengikuti karakter akun bila sudah diatur.")}</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
          <Field label={t("Platform")}><Select value={platform} onChange={setPlatform} options={platOpts} /></Field>
          <Field label={t("Jumlah ide")}><NumberField value={count} onChange={setCount} min={3} max={14} /></Field>
        </div>
        <Field label={t("Tema / arahan (opsional)")} style={{ marginTop: 12 }}>
          <Textarea value={seed} onChange={(e) => setSeed(e.target.value)} style={{ minHeight: 48 }} placeholder={t("Mis. sambut bulan Ramadan, promo paket keluarga…")} />
        </Field>
        <Field label={t("Pilar konten (opsional, pisah koma)")} style={{ marginTop: 12 }}>
          <Input value={pillars} onChange={(e) => setPillars(e.target.value)} placeholder={t("Edukasi, Testimoni, Di balik layar")} />
        </Field>

        <div style={{ marginTop: 14 }}>
          <Button variant="primary" full disabled={busy} icon={busy ? <Spinner size={15} color="#fff" /> : <Icons.sparkle size={16} />} onClick={generate}>
            {ideas ? t("Buat ulang") : t("Buatkan ide")}
          </Button>
        </div>

        {ideas && (
          <div style={{ marginTop: 16 }}>
            {ideas.length === 0 ? (
              <div style={{ fontFamily: FPl, fontSize: 13, color: "var(--ink-400)", textAlign: "center", padding: 16 }}>{t("Tidak ada ide dihasilkan. Coba lagi.")}</div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontFamily: FPl, fontSize: 12, fontWeight: 600, color: "var(--ink-600)" }}>{pickedCount} {t("dari")} {ideas.length} {t("dipilih")}</span>
                  <button onClick={() => setPicked(Object.fromEntries(ideas.map((_, i) => [i, pickedCount !== ideas.length])))} style={{ border: "none", background: "none", cursor: "pointer", fontFamily: FPl, fontSize: 12, fontWeight: 600, color: "var(--primary-500)" }}>{pickedCount === ideas.length ? t("Batal semua") : t("Pilih semua")}</button>
                </div>
                <div className="sc-scroll" style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                  {ideas.map((idea, i) => (
                    <div key={i} onClick={() => setPicked((s) => ({ ...s, [i]: !s[i] }))}
                      style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: "11px 13px", border: `1px solid ${picked[i] ? "var(--primary-300)" : "var(--line)"}`, background: picked[i] ? "var(--primary-100)" : "var(--surface)", borderRadius: 12, cursor: "pointer" }}>
                      <div style={{ marginTop: 1 }}><Checkbox checked={!!picked[i]} onChange={() => setPicked((s) => ({ ...s, [i]: !s[i] }))} size={18} /></div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontFamily: FPl, fontWeight: 600, fontSize: 13.5, color: "var(--ink-900)" }}>{idea.title}</div>
                        <div style={{ fontFamily: FPl, fontSize: 11.5, color: "var(--ink-500)", marginTop: 2, lineHeight: 1.45 }}>{idea.angle}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                          {[idea.pillar, FORMAT_LABEL[idea.format] || idea.format, idea.contentType].filter(Boolean).map((t, x) => (
                            <span key={x} style={{ fontFamily: FPl, fontSize: 10.5, color: "var(--ink-500)", background: "rgba(140,144,158,.13)", padding: "2px 8px", borderRadius: 999 }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontFamily: FPl, fontSize: 11.5, color: "var(--ink-400)", marginTop: 10 }}>{t("Ide tersimpan sebagai status")} <b>{t("Ide")}</b>{t(", tanggal disebar mulai besok. Buka salah satu untuk kembangkan konsep, script, & caption.")}</div>
              </>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
          <Button variant="ghost" disabled={busy || saving} onClick={onClose}>{t("Tutup")}</Button>
          {ideas && ideas.length > 0 && (
            <Button variant="primary" disabled={saving || busy || pickedCount === 0} icon={saving ? <Spinner size={15} color="#fff" /> : <Icons.check size={16} />} onClick={savePicked}>{t("Tambahkan")} {pickedCount} {t("ke rencana")}</Button>
          )}
        </div>
      </div>
    </Modal>
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
              <Button size="sm" variant="ghost" icon={<Icons.plus size={14} />} onClick={() => create(pf)}>{t("Konten")}</Button>
            </div>
            {laneRows.length === 0
              ? <div style={{ fontFamily: FPl, fontSize: 12, color: "var(--ink-300)", padding: "14px 2px" }}>{t("Belum ada konten")} {t(m.label)}.</div>
              : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{laneRows.map(p => <Row key={p.id} p={p} compact />)}</div>}
          </Panel>
        );
      })}
    </div>
  );
}
