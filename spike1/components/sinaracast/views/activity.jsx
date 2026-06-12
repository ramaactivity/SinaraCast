"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp, useFetchState } from "../store";
import { Topbar } from "../shell";
import {
  BRANDS, BrandAvatar, Panel, Button, IconButton, Status, MediaThumb,
  EmptyState, Skeleton, Progress, SectionTitle, Modal, Segmented, Sparkline,
} from "../ui";
const { useState: uAc } = React;
const FA = "var(--font)";

const TRIGGER = { scheduled: "Otomatis", manual: "Manual", retry: "Coba lagi", swap: "Ganti gambar" };
// Brand styling for a channel slug, with a neutral fallback for channels added
// via OAuth that aren't in the preset BRANDS map.
const brandFor = (slug, channels) => BRANDS[slug] || {
  name: channels.find(c => c.id === slug)?.name || slug,
  short: (channels.find(c => c.id === slug)?.name || slug || "?").slice(0, 2).toUpperCase(),
  accent: "var(--ink-500)", soft: "var(--line)", grad: "linear-gradient(135deg,#9aa0ab,#7a8090)",
};

export function ActivityView() {
  const app = useApp();
  const phase = app.dataLoading ? "loading" : "ready";
  const [filter, setFilter] = uAc("all");
  const [open, setOpen] = uAc(null);
  // Reset the account filter on brand switch (a stale account id blanks the list).
  React.useEffect(() => { setFilter("all"); }, [app.brand]);

  // scoped to the active brand's accounts
  const brandAccts = app.brandAccounts || [];
  const brandSlugs = new Set(brandAccts.map(a => a.id));
  const runs = app.runs.filter(r => brandSlugs.has(r.ch) && (filter === "all" || r.ch === filter));
  const openRun = app.runs.find(r => r.id === open);
  const filters = [{ value: "all", label: "Semua" }, ...brandAccts.map(a => ({ value: a.id, label: a.handle }))];

  return (
    <div>
      <Topbar title="Riwayat" sub={`${app.activeBrand?.name || "Semua"} · postingan akun brand ini · WIB`}
        right={brandAccts.length > 1 ? <Segmented options={filters} value={filter} onChange={setFilter} /> : null} />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 18, alignItems: "start" }}>
        <Panel flush style={{ overflow: "hidden" }}>
          {phase === "loading" && <div style={{ padding: 20 }}>{[0,1,2,3,4].map(i => <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--line)" }}><Skeleton w={34} h={48} r={9} /><div style={{ flex: 1 }}><Skeleton w="30%" h={14} /><div style={{ height: 7 }} /><Skeleton w="50%" h={11} /></div><Skeleton w={80} h={24} r={999} /></div>)}</div>}

          {phase === "ready" && runs.length === 0 && <EmptyState icon={<Icons.activity size={28} />} title="Belum ada riwayat" body="Postingan akan muncul di sini setelah jadwal berjalan atau kamu terbitkan manual." />}

          {phase === "ready" && runs.length > 0 && (
            <div>
              {!app.isMobile && (
              <div style={{ display: "grid", gridTemplateColumns: "48px minmax(0,1fr) 150px 140px 110px", gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--line)", fontFamily: FA, fontSize: 10.5, fontWeight: 600, letterSpacing: ".06em", color: "var(--ink-400)" }}>
                <span></span><span>JADWAL · AKUN</span><span>WAKTU (WIB)</span><span>METRIK</span><span style={{ textAlign: "right" }}>STATUS</span>
              </div>
              )}
              {runs.map(r => {
                const b = brandFor(r.ch, app.channels);
                const tfull = r.actual !== "—" ? r.actual : r.sched;
                const tstr = tfull.split(", ")[1] || tfull;
                return (
                  <div key={r.id} onClick={() => setOpen(r.id)} style={{ display: "grid", gridTemplateColumns: app.isMobile ? "40px minmax(0,1fr) auto" : "48px minmax(0,1fr) 150px 140px 110px", gap: 12, padding: app.isMobile ? "12px 16px" : "13px 20px", borderBottom: "1px solid var(--line)", cursor: "pointer", alignItems: "center", transition: "background .12s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(140,144,158,.06)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <MediaThumb seed={r.img} src={r.thumbUrl} w={34} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: FA, fontWeight: 600, fontSize: 13.5, color: "var(--ink-900)" }}>{r.rule}</span>
                        <span style={{ fontFamily: FA, fontSize: 10, fontWeight: 600, color: b.accent, background: b.soft, padding: "1px 7px", borderRadius: 999 }}>{TRIGGER[r.trigger]}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, fontFamily: FA, fontSize: 11.5, color: "var(--ink-400)", flexWrap: "wrap" }}>
                        <BrandAvatar brand={b} size={14} />{b.name}{app.isMobile && <span>· {tstr} WIB</span>}{r.fail ? <span style={{ color: "var(--danger)" }}>· {r.fail}</span> : null}
                      </div>
                    </div>
                    {!app.isMobile && <span style={{ fontFamily: FA, fontSize: 12, color: "var(--ink-500)", fontVariantNumeric: "tabular-nums" }}>{tfull}</span>}
                    {!app.isMobile && <RunMetrics r={r} />}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                      {r.status === "Failed" && <IconButton size={30} icon={<Icons.retry size={15} />} tone="green" tip="Coba lagi" onClick={e => { e.stopPropagation(); const rule = app.rules.find(x => x.id === r.ruleId); rule ? app.postNow(rule) : app.toast("Jadwal untuk postingan ini sudah tidak ada", "error"); }} />}
                      <Status s={r.status} pulse={r.status === "Publishing"} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <WeekCard runs={runs} />
          <StorageCard />
        </div>
      </div>

      <RunDetail run={openRun} onClose={() => setOpen(null)} />
    </div>
  );
}

// Inline views/reach for a published run — the data the table's width was wasted on.
const fmtC = (n) => n >= 1e6 ? (n / 1e6).toFixed(1).replace(".0", "") + "jt" : n >= 1e3 ? (n / 1e3).toFixed(1).replace(".0", "") + "rb" : String(n);
function RunMetrics({ r }) {
  if (r.status !== "Published") return <span style={{ fontFamily: FA, fontSize: 11.5, color: "var(--ink-200)" }}>—</span>;
  if (!r.hasMetrics) return <span style={{ fontFamily: FA, fontSize: 11, color: "var(--ink-300)" }}>{r.metricsPulledAt ? "tidak tersedia" : "±24 jam"}</span>;
  const cell = (icon, v, tip) => v == null ? null : (
    <span title={tip} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ color: "var(--ink-300)", display: "inline-flex" }}>{icon}</span>
      <span style={{ fontFamily: FA, fontSize: 12, fontWeight: 700, color: "var(--ink-700)", fontVariantNumeric: "tabular-nums" }}>{fmtC(v)}</span>
    </span>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {cell(<Icons.eye size={13} />, r.m?.views, "Dilihat")}
      {cell(<Icons.user size={13} />, r.m?.reach, "Jangkauan")}
    </div>
  );
}

// Right-rail digest: the brand's last 7 days at a glance + failures you can act on.
function WeekCard({ runs }) {
  const app = useApp();
  const wibNow = new Date(Date.now() + 7 * 3600 * 1000);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate() - (6 - i)));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  });
  const inWeek = runs.filter(r => last7.includes(r.dateWib));
  const ct = (s) => inWeek.filter(r => r.status === s).length;
  const perDay = last7.map(k => inWeek.filter(r => r.dateWib === k && r.status === "Published").length);
  const fails = runs.filter(r => r.status === "Failed").slice(0, 3);
  const rows = [
    { label: "Terbit", n: ct("Published"), c: "var(--st-success)" },
    { label: "Gagal", n: ct("Failed"), c: "var(--st-failed)" },
    { label: "Dilewati", n: ct("Skipped"), c: "var(--st-skipped)" },
  ];
  return (
    <Panel strong>
      <SectionTitle sub="Aktivitas brand ini">7 hari terakhir</SectionTitle>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontFamily: FA, fontWeight: 600, fontSize: 26, color: "var(--ink-900)", letterSpacing: "-.02em" }}>{ct("Published")}</span>
        <Sparkline data={perDay} w={120} h={32} color="var(--st-success)" />
      </div>
      <div style={{ fontFamily: FA, fontSize: 11.5, color: "var(--ink-400)", marginTop: 2, marginBottom: 12 }}>postingan terbit minggu ini</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map(r => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.c, flex: "0 0 auto" }} />
            <span style={{ flex: 1, fontFamily: FA, fontSize: 12.5, color: "var(--ink-600)" }}>{r.label}</span>
            <span style={{ fontFamily: FA, fontSize: 12.5, fontWeight: 700, color: "var(--ink-700)", fontVariantNumeric: "tabular-nums" }}>{r.n}</span>
          </div>
        ))}
      </div>
      {fails.length > 0 && (
        <>
          <div style={{ height: 1, background: "var(--line)", margin: "14px 0" }} />
          <div style={{ fontFamily: FA, fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--danger)", marginBottom: 8 }}>Perlu perhatian</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {fails.map(f => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ flex: 1, fontFamily: FA, fontSize: 12, color: "var(--ink-700)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.rule}</span>
                <IconButton size={26} icon={<Icons.retry size={13} />} tone="green" tip="Coba lagi"
                  onClick={() => { const rule = app.rules.find(x => x.id === f.ruleId); rule ? app.postNow(rule) : app.toast("Jadwal untuk postingan ini sudah tidak ada", "error"); }} />
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

function StorageCard() {
  const app = useApp();
  const { used, total, perChannel = {} } = app.settings.storage;
  const pct = Math.min(100, Math.round((used / total) * 100));
  return (
    <Panel strong>
      <SectionTitle sub="Media tersimpan">Penyimpanan</SectionTitle>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
        <span style={{ fontFamily: FA, fontWeight: 600, fontSize: 22, color: "var(--ink-900)" }}>{used} MB</span>
        <span style={{ fontFamily: FA, fontSize: 12, color: "var(--ink-400)" }}>/ {total} MB</span>
      </div>
      <Progress value={pct} showWarn h={9} />
      <div style={{ fontFamily: FA, fontSize: 11.5, color: pct >= 80 ? "var(--danger)" : "var(--ink-400)", marginTop: 9 }}>{pct}% terpakai{pct >= 80 ? ", hampir penuh" : ""}</div>
      {(app.brandAccounts || []).length > 0 && <div style={{ height: 1, background: "var(--line)", margin: "16px 0" }} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {(app.brandAccounts || []).map(c => { const b = brandFor(c.id, app.channels); const mb = perChannel[c.id] ?? 0; return (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BrandAvatar brand={b} size={22} />
            <span style={{ flex: 1, fontFamily: FA, fontSize: 12, color: "var(--ink-600)" }}>{b.name.split(" ")[0]}</span>
            <span style={{ fontFamily: FA, fontSize: 11.5, color: "var(--ink-400)" }}>{mb} MB</span>
          </div>
        ); })}
      </div>
    </Panel>
  );
}

function RunDetail({ run, onClose }) {
  const app = useApp();
  if (!run) return null;
  const b = brandFor(run.ch, app.channels);
  const row = (label, val, mono) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
      <span style={{ fontFamily: FA, fontSize: 12.5, color: "var(--ink-400)" }}>{label}</span>
      <span style={{ fontFamily: mono ? "ui-monospace,monospace" : FA, fontSize: 12.5, fontWeight: 500, color: "var(--ink-900)", textAlign: "right" }}>{val}</span>
    </div>
  );
  return (
    <Modal open={!!run} onClose={onClose} width={540}>
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span style={{ fontFamily: FA, fontWeight: 600, fontSize: 18, color: "var(--ink-900)" }}>Detail postingan</span>
            <Status s={run.status} pulse={run.status === "Publishing"} />
          </div>
          <IconButton icon={<Icons.x size={18} />} onClick={onClose} />
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          <div style={{ position: "relative" }}>
            <MediaThumb seed={run.img} src={run.thumbUrl} w={120} label="9:16" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {row("Akun", <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><BrandAvatar brand={b} size={18} /> {b.name}</span>)}
            {row("Jadwal", run.rule)}
            {row("Sumber", TRIGGER[run.trigger])}
            {row("Dijadwalkan", run.sched, true)}
            {row("Terbit", run.actual, true)}
          </div>
        </div>

        {run.fail && <div style={{ marginTop: 16, background: "var(--danger-bg)", borderRadius: 12, padding: "12px 14px", display: "flex", gap: 9 }}><Icons.alert size={17} style={{ color: "var(--danger)", flex: "0 0 auto" }} /><span style={{ fontFamily: FA, fontSize: 12.5, color: "var(--danger)", lineHeight: 1.45 }}>{run.fail}</span></div>}

        {run.link && <a href={"https://" + run.link} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 16, textDecoration: "none", background: "var(--green-100)", borderRadius: 12, padding: "12px 14px", fontFamily: FA, fontSize: 12.5, fontWeight: 500, color: "var(--green-500)" }}><Icons.external size={16} />{run.link}</a>}

        {run.hasMetrics && (
          <div style={{ display: "flex", gap: 16, marginTop: 16, background: "rgba(140,144,158,.07)", borderRadius: 12, padding: "12px 14px", flexWrap: "wrap" }}>
            {[
              [<Icons.eye size={14} key="i" />, run.m?.views, "Dilihat"],
              [<Icons.user size={14} key="i" />, run.m?.reach, "Jangkauan"],
              [<Icons.heart size={14} key="i" />, run.m?.likes, "Suka"],
              [<Icons.comment size={14} key="i" />, run.kind === "story" ? run.m?.replies : run.m?.comments, run.kind === "story" ? "Balasan" : "Komentar"],
              [<Icons.send size={14} key="i" />, run.m?.shares, "Dibagikan"],
              [<Icons.bookmark size={14} key="i" />, run.m?.saves, "Disimpan"],
            ].map(([icon, v, label]) => v == null ? null : (
              <span key={label} title={label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ color: "var(--ink-300)", display: "inline-flex" }}>{icon}</span>
                <span style={{ fontFamily: FA, fontSize: 13, fontWeight: 700, color: "var(--ink-800)", fontVariantNumeric: "tabular-nums" }}>{fmtC(v)}</span>
              </span>
            ))}
          </div>
        )}

        <div style={{ fontFamily: FA, fontWeight: 600, fontSize: 12.5, color: "var(--ink-500)", margin: "20px 0 10px" }}>Riwayat proses</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {run.attempts.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 12, paddingBottom: i < run.attempts.length - 1 ? 14 : 0, position: "relative" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", flex: "0 0 auto", display: "grid", placeItems: "center", background: a.fail ? "var(--danger-bg)" : "var(--green-100)", color: a.fail ? "var(--danger)" : "var(--green-500)" }}>{a.fail ? <Icons.x size={12} sw={2.4} /> : <Icons.check size={12} sw={2.4} />}</span>
                {i < run.attempts.length - 1 && <span style={{ width: 2, flex: 1, background: "var(--line)", marginTop: 2 }} />}
              </div>
              <div style={{ paddingTop: 1 }}>
                <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, color: "var(--ink-400)" }}>{a.t}</span>
                <div style={{ fontFamily: FA, fontSize: 12.5, color: "var(--ink-700)", marginTop: 1 }}>{a.o}</div>
              </div>
            </div>
          ))}
        </div>

        {run.status === "Failed" && <Button variant="primary" full icon={<Icons.retry size={16} />} style={{ marginTop: 20 }} onClick={() => { const rule = app.rules.find(x => x.id === run.ruleId); rule ? app.postNow(rule) : app.toast("Jadwal untuk postingan ini sudah tidak ada", "error"); onClose(); }}>Coba lagi sekarang</Button>}
      </div>
    </Modal>
  );
}
